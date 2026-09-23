import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { createProduct, deactivateProduct, getInventorySummary, listCategories, listProducts, updateProduct } from "./db";
import { createPurchaseOrder, getLatestPurchaseOrder, getSuggestedOrderItems, recordReceivedItem, sendPurchaseOrderToLine } from "./db-orders";
import { adjustStock, issueStock, listMovements, getMovementSummary, receiveStock } from "./db-movements";
import { verifyLineAccessToken } from "./line-auth";
import { createUnit, deactivateUnit, listUnits, seedDefaultUnits, suggestSku, updateUnit } from "./db-units";

const productInput = z.object({ barcode: z.string().trim().min(1, "กรุณาระบุบาร์โค้ด").max(64), sku: z.string().trim().min(1, "กรุณาระบุ SKU").max(64), name: z.string().trim().min(1, "กรุณาระบุชื่อสินค้า").max(255), category: z.string().trim().min(1).max(100), unit: z.string().trim().min(1).max(32), costPrice: z.number().finite().min(0), sellPrice: z.number().finite().min(0), minimumStock: z.number().int().min(0), quantity: z.number().int().min(0) });
const filtersInput = z.object({ search: z.string().optional(), category: z.string().optional(), status: z.enum(["all", "inStock", "low", "out"]).optional() });
function featureError(error: unknown): never { if (error instanceof Error) throw new TRPCError({ code: "BAD_REQUEST", message: error.message }); throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "เกิดข้อผิดพลาดของระบบ" }); }
const lineProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const header = ctx.req.headers["x-liff-access-token"];
  const token = Array.isArray(header) ? header[0] : header;
  const lineIdentity = await verifyLineAccessToken(token);
  return next({ ctx: { ...ctx, lineIdentity } });
});
const stockWriteProcedure = publicProcedure.use(async ({ ctx, next }) => {
  if (ctx.user?.role === "admin") return next({ ctx: { ...ctx, lineIdentity: undefined } });
  const header = ctx.req.headers["x-liff-access-token"];
  const token = Array.isArray(header) ? header[0] : header;
  const lineIdentity = await verifyLineAccessToken(token);
  if (!lineIdentity.canWrite) throw new TRPCError({ code: "FORBIDDEN", message: "บัญชีนี้ยังไม่มีสิทธิ์บันทึกสต็อก" });
  return next({ ctx: { ...ctx, lineIdentity } });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({ me: publicProcedure.query((opts) => opts.ctx.user), logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }) }),
  products: router({
    list: publicProcedure.input(filtersInput).query(async ({ input }) => { try { return await listProducts(input); } catch (error) { return featureError(error); } }),
    categories: publicProcedure.query(async () => { try { return await listCategories(); } catch (error) { return featureError(error); } }),
    create: publicProcedure.input(productInput).mutation(async ({ input }) => { try { return await createProduct(input); } catch (error) { return featureError(error); } }),
    update: publicProcedure.input(z.object({ id: z.number().int().positive(), data: productInput })).mutation(async ({ input }) => { try { return await updateProduct(input.id, input.data); } catch (error) { return featureError(error); } }),
    deactivate: publicProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => { try { return await deactivateProduct(input.id); } catch (error) { return featureError(error); } }),
    suggestSku: publicProcedure.input(z.object({ name: z.string().max(255), category: z.string().max(100) })).query(async ({ input }) => { try { return await suggestSku(input.name, input.category); } catch (error) { return featureError(error); } }),
  }),
  units: router({
    list: publicProcedure.input(z.object({ includeInactive: z.boolean().optional() }).optional()).query(async ({ input }) => { try { const result = await listUnits(input?.includeInactive); return result.length > 0 ? result : seedDefaultUnits(); } catch (error) { return featureError(error); } }),
    create: publicProcedure.input(z.object({ name: z.string().trim().min(1).max(32) })).mutation(async ({ input }) => { try { return await createUnit(input.name); } catch (error) { return featureError(error); } }),
    update: publicProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().trim().min(1).max(32) })).mutation(async ({ input }) => { try { return await updateUnit(input.id, input.name); } catch (error) { return featureError(error); } }),
    deactivate: publicProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => { try { return await deactivateUnit(input.id); } catch (error) { return featureError(error); } }),
  }),
  inventory: router({
    summary: publicProcedure.query(async () => { try { return await getInventorySummary(); } catch (error) { return featureError(error); } }),
    movementSummary: publicProcedure.query(async () => { try { return await getMovementSummary(); } catch (error) { return featureError(error); } }),
    issue: stockWriteProcedure.input(z.object({ productId: z.number().int().positive(), quantity: z.number().int().positive(), note: z.string().trim().max(500).optional() })).mutation(async ({ ctx, input }) => { try { return await issueStock({ ...input, createdBy: ctx.user?.id }); } catch (error) { return featureError(error); } }),
    adjust: stockWriteProcedure.input(z.object({ productId: z.number().int().positive(), targetQuantity: z.number().int().min(0), note: z.string().trim().min(1, "กรุณาระบุเหตุผลการปรับยอด").max(500) })).mutation(async ({ ctx, input }) => { try { return await adjustStock({ ...input, createdBy: ctx.user?.id }); } catch (error) { return featureError(error); } }),
  }),
  movements: router({
    list: publicProcedure.input(z.object({ search: z.string().optional(), type: z.enum(["all", "receive", "issue", "adjustment", "opening"]).optional(), from: z.coerce.date().optional(), to: z.coerce.date().optional() }).optional()).query(async ({ input }) => { try { return await listMovements(input ?? {}); } catch (error) { return featureError(error); } }),
    summary: publicProcedure.query(async () => { try { return await getMovementSummary(); } catch (error) { return featureError(error); } }),
  }),
  orders: router({
    suggested: publicProcedure.query(async () => { try { return await getSuggestedOrderItems(); } catch (error) { return featureError(error); } }),
    latest: publicProcedure.query(async () => { try { return await getLatestPurchaseOrder(); } catch (error) { return featureError(error); } }),
    create: publicProcedure.input(z.object({ items: z.array(z.object({ productId: z.number().int().positive(), quantityOrdered: z.number().int().positive() })).min(1) })).mutation(async ({ input }) => { try { return await createPurchaseOrder(input.items); } catch (error) { return featureError(error); } }),
    sendLine: publicProcedure.input(z.object({ orderId: z.number().int().positive() })).mutation(async ({ input }) => { try { return await sendPurchaseOrderToLine(input.orderId); } catch (error) { return featureError(error); } }),
    receive: stockWriteProcedure.input(z.object({ itemId: z.number().int().positive(), quantityReceived: z.number().int().min(0) })).mutation(async ({ input }) => { try { return await recordReceivedItem(input.itemId, input.quantityReceived); } catch (error) { return featureError(error); } }),
  }),
  lineApp: router({
    me: lineProcedure.query(({ ctx }) => ({ lineUserId: ctx.lineIdentity.lineUserId, displayName: ctx.lineIdentity.displayName, pictureUrl: ctx.lineIdentity.pictureUrl, canWrite: ctx.lineIdentity.canWrite })),
    movement: lineProcedure.input(z.object({ productId: z.number().int().positive(), type: z.enum(["receive", "issue", "adjustment"]), quantity: z.number().int().positive().optional(), targetQuantity: z.number().int().min(0).optional(), note: z.string().trim().max(500).optional(), operationKey: z.string().trim().min(8).max(128) })).mutation(async ({ ctx, input }) => {
      if (!ctx.lineIdentity.canWrite) throw new TRPCError({ code: "FORBIDDEN", message: "บัญชี LINE นี้ยังไม่มีสิทธิ์บันทึกสต็อก" });
      try {
        const common = { productId: input.productId, note: input.note, lineUserId: ctx.lineIdentity.lineUserId, lineOperationKey: input.operationKey };
        if (input.type === "adjustment") {
          if (input.targetQuantity === undefined) throw new TRPCError({ code: "BAD_REQUEST", message: "กรุณาระบุยอดคงเหลือใหม่" });
          return await adjustStock({ ...common, targetQuantity: input.targetQuantity });
        }
        if (input.quantity === undefined) throw new TRPCError({ code: "BAD_REQUEST", message: "กรุณาระบุจำนวนรายการ" });
        return input.type === "issue" ? await issueStock({ ...common, quantity: input.quantity }) : await receiveStock({ ...common, quantity: input.quantity });
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        return featureError(error);
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
