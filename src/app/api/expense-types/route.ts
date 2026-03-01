import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const transferFeeExists = await db.expenseType.findFirst({
      where: {
        userId: session.user.id,
        name: "Transfer fee",
      },
    });

    if (!transferFeeExists) {
      await db.expenseType.create({
        data: {
          userId: session.user.id,
          name: "Transfer fee",
          isSystem: true,
          monthlyBudget: null,
        },
      });
    }

    const expenseTypes = await db.expenseType.findMany({
      where: {
        userId: session.user.id
      },
      include: {
        subcategories: {
          orderBy: {
            name: 'asc'
          }
        }
      },
      orderBy: {
        monthlyBudget: 'desc',
      }
    });

    return NextResponse.json(expenseTypes, { status: 200 });

  } catch (error) {
    console.error('Error getting expense types: ', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const { name, monthlyBudget, subcategories } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      );
    }

    const result = await db.$transaction(async (tx) => {
      const expenseType = await tx.expenseType.create({
        data: {
          userId: session.user.id,
          name,
          monthlyBudget: monthlyBudget ? parseFloat(monthlyBudget) : null,
        }
      });

      if (subcategories && Array.isArray(subcategories) && subcategories.length > 0) {
        await tx.expenseSubcategory.createMany({
          data: subcategories.map((sub: { name: string }) => ({
            userId: session.user.id,
            expenseTypeId: expenseType.id,
            name: sub.name,
          }))
        });
      }

      const expenseTypeWithSubcategories = await tx.expenseType.findUnique({
        where: { id: expenseType.id },
        include: {
          subcategories: {
            orderBy: {
              name: 'asc'
            }
          }
        }
      });

      return expenseTypeWithSubcategories;
    });

    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error('Error creating expense type: ', error);

    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'An expense type with this name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}