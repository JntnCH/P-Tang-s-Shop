import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { createProduct, deactivateProduct, getInventorySummary, listCategories, listProducts, updateProduct } from "./db";
import { createPurchaseOrder, getLatestPurchaseOrder, getSuggestedOrderItems, recordReceivedItem, sendPurchaseOrderToLine } from "./db-orders";

const productInput = z.object({ barcode: z.string().trim().min(1, "กรุณาระบุบาร์โค้ด").max(64), sku: z.string().trim().min(1, "กรุณาระบุ SKU").max(64), name: z.string().trim().min(1, "กรุณาระบุชื่อสินค้า").max(255), category: z.string().trim().min(1).max(100), unit: z.string().trim().min(1).max(32), costPrice: z.number().finite().min(0), sellPrice: z.number().finite().min(0), minimumStock: z.number().int().min(0), quantity: z.number().int().min(0) });
const filtersInput = z.object({ search: z.string().optional(), category: z.string().optional(), status: z.enum(["all", "inStock", "low", "out"]).optional() });
function featureError(error: unknown): never { if (error instanceof Error) throw new TRPCError({ code: "BAD_REQUEST", message: error.message }); throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "เกิดข้อผิดพลาดของระบบ" }); }

export const appRouter = router({
  system: systemRouter,
  auth: router({ me: publicProcedure.query((opts) => opts.ctx.user), logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }) }),
  products: router({
    list: publicProcedure.input(filtersInput).query(async ({ input }) => { try { return await listProducts(input); } catch (error) { return featureError(error); } }),
    categories: publicProcedure.query(async () => { try { return await listCategories(); } catch (error) { return featureError(error); } }),
    create: publicProcedure.input(productInput).mutation(async ({ input }) => { try { return await createProduct(input); } catch (error) { return featureError(error); } }),
    update: publicProcedure.input(z.object({ id: z.number().int().positive(), data: productInput })).mutation(async ({ input }) => { try { return await updateProduct(input.id, input.data); } catch (error) { return featureError(error); } }),
    deactivate: publicProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => { try { return await deactivateProduct(input.id); } catch (error) { return featureError(error); } }),
  }),
  inventory: router({ summary: publicProcedure.query(async () => { try { return await getInventorySummary(); } catch (error) { return featureError(error); } }) }),
  orders: router({
    suggested: publicProcedure.query(async () => { try { return await getSuggestedOrderItems(); } catch (error) { return featureError(error); } }),
    latest: publicProcedure.query(async () => { try { return await getLatestPurchaseOrder(); } catch (error) { return featureError(error); } }),
    create: publicProcedure.input(z.object({ items: z.array(z.object({ productId: z.number().int().positive(), quantityOrdered: z.number().int().positive() })).min(1) })).mutation(async ({ input }) => { try { return await createPurchaseOrder(input.items); } catch (error) { return featureError(error); } }),
    sendLine: publicProcedure.input(z.object({ orderId: z.number().int().positive() })).mutation(async ({ input }) => { try { return await sendPurchaseOrderToLine(input.orderId); } catch (error) { return featureError(error); } }),
    receive: publicProcedure.input(z.object({ itemId: z.number().int().positive(), quantityReceived: z.number().int().min(0) })).mutation(async ({ input }) => { try { return await recordReceivedItem(input.itemId, input.quantityReceived); } catch (error) { return featureError(error); } }),
  }),
});

export type AppRouter = typeof appRouter;
