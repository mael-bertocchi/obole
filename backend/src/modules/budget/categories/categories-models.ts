import type { RequestGenericInterface } from 'fastify';
import { CategorySchema } from 'src/modules/budget/state/state-models';
import { IdSchema } from 'src/shared/schemas';
import { z } from 'zod';

/**
 * @constant CategoryWriteSchema
 * @description Zod schema for storing a category under the id the request names: how it looks, its monthly limit and
 * where it sits in the list.
 */
export const CategoryWriteSchema = CategorySchema.omit({ id: true }).extend({
    position: z.number().int().min(0).max(1000)
});

/**
 * @constant CategoryParamsSchema
 * @description Zod schema for the category a request is about.
 */
export const CategoryParamsSchema = z.object({
    categoryId: IdSchema
});

/**
 * @interface CategoryWriteRequest
 * @description Fastify request generic for storing a category.
 *
 * @extends RequestGenericInterface
 */
export interface CategoryWriteRequest extends RequestGenericInterface {
    Params: z.infer<typeof CategoryParamsSchema>; /*!< The category */
    Body: CategoryWrite; /*!< What it holds */
}

/**
 * @interface CategoryDeleteRequest
 * @description Fastify request generic for removing a category.
 *
 * @extends RequestGenericInterface
 */
export interface CategoryDeleteRequest extends RequestGenericInterface {
    Params: z.infer<typeof CategoryParamsSchema>; /*!< The category */
}

/**
 * @type CategoryWrite
 * @description What storing a category says.
 */
export type CategoryWrite = z.infer<typeof CategoryWriteSchema>;

/**
 * @type StoredCategory
 * @description A category as the routes send it.
 */
export type StoredCategory = z.infer<typeof CategorySchema> & { position: number };
