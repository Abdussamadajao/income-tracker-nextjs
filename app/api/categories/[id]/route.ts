import { NextResponse } from "next/server";
import { withAuth } from "@/server/require-auth";
import { prisma } from "@/server/prisma";
import { authLogger } from "@/server/log";

type CategoryBody = {
  name: string;
  icon: string;
  color: string;
  description?: string | null;
  type: "INCOME" | "EXPENSE";
};

export const GET = withAuth(
  async (_req, { user, params }) => {
    const { id } = params;

    try {
      const category = await prisma.category.findUnique({
        where: { id },
      });

      if (!category) {
        return NextResponse.json(
          { error: "Category not found" },
          { status: 404 },
        );
      }

      if (!category.is_system && category.user_id !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      return NextResponse.json({ data: category });
    } catch (err) {
      authLogger.error({ err, userId: user.id }, "Failed to fetch category");
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
);

export const PATCH = withAuth(
  async (req, { user, params }) => {
    const { id } = params;

    try {
      const existing = await prisma.category.findUnique({ where: { id } });

      if (!existing) {
        return NextResponse.json(
          { error: "Category not found" },
          { status: 404 },
        );
      }

      if (existing.is_system) {
        return NextResponse.json(
          { error: "Cannot edit system categories" },
          { status: 403 },
        );
      }

      if (existing.user_id !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const body: Partial<CategoryBody> = await req.json();

      if (body.name && body.name !== existing.name) {
        const duplicate = await prisma.category.findFirst({
          where: {
            name: { equals: body.name, mode: "insensitive" },
            type: existing.type,
            user_id: user.id,
            NOT: { id },
          },
        });

        if (duplicate) {
          return NextResponse.json(
            { error: "You already have a category with this name" },
            { status: 422 },
          );
        }
      }

      const updated = await prisma.category.update({
        where: { id },
        data: {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.icon !== undefined && { icon: body.icon }),
          ...(body.color !== undefined && { color: body.color }),
          ...(body.description !== undefined && {
            description: body.description,
          }),
        },
      });

      authLogger.info({ userId: user.id, categoryId: id }, "Category updated");

      return NextResponse.json({ data: updated });
    } catch (err) {
      authLogger.error({ err, userId: user.id }, "Failed to update category");
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
);

export const DELETE = withAuth(
  async (_req, { user, params }) => {
    const { id } = params;

    try {
      const existing = await prisma.category.findUnique({ where: { id } });

      if (!existing) {
        return NextResponse.json(
          { error: "Category not found" },
          { status: 404 },
        );
      }

      if (existing.is_system) {
        return NextResponse.json(
          { error: "Cannot delete system categories" },
          { status: 403 },
        );
      }

      if (existing.user_id !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      await prisma.category.delete({ where: { id } });

      authLogger.info({ userId: user.id, categoryId: id }, "Category deleted");

      return new Response(null, { status: 204 });
    } catch (err) {
      authLogger.error({ err, userId: user.id }, "Failed to delete category");
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
);
