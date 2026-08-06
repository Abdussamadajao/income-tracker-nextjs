import { NextRequest, NextResponse } from "next/server";
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

export const GET = withAuth(async (req: NextRequest, { user }) => {
  const type = req.nextUrl.searchParams.get("type");

  try {
    const data = await prisma.category.findMany({
      where: {
        OR: [{ is_system: true }, { user_id: user.id }],
        ...(type && { type: type as "INCOME" | "EXPENSE" }),
      },
      orderBy: [
        { is_system: "desc" },
        { created_at: "asc" },
      ],
    });

    return NextResponse.json({ data });
  } catch (err) {
    authLogger.error({ err, userId: user.id }, "Failed to fetch categories");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});

export const POST = withAuth(async (req, { user }) => {
  try {
    const body: CategoryBody = await req.json();

    if (!body.name || !body.icon || !body.color || !body.type) {
      return NextResponse.json(
        { error: "name, icon, color and type are required" },
        { status: 400 },
      );
    }

    if (!["INCOME", "EXPENSE"].includes(body.type)) {
      return NextResponse.json(
        { error: "type must be INCOME or EXPENSE" },
        { status: 400 },
      );
    }

    const duplicate = await prisma.category.findFirst({
      where: {
        name: { equals: body.name, mode: "insensitive" },
        type: body.type,
        user_id: user.id,
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "You already have a category with this name" },
        { status: 422 },
      );
    }

    const category = await prisma.category.create({
      data: {
        name: body.name,
        icon: body.icon,
        color: body.color,
        description: body.description,
        type: body.type,
        is_system: false,
        user_id: user.id,
      },
    });

    authLogger.info(
      { userId: user.id, categoryId: category.id },
      "Category created",
    );

    return NextResponse.json({ data: category }, { status: 201 });
  } catch (err) {
    authLogger.error({ err, userId: user.id }, "Failed to create category");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
