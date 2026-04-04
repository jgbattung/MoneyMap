import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { ExpenseTypeValidation } from "@/lib/validations/expense";
import { PrismaPromise } from "@prisma/client";
import { randomUUID } from "crypto";
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

    const parseResult = ExpenseTypeValidation.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name, monthlyBudget } = parseResult.data;
    const { subcategories } = body;

    const expenseTypeId = randomUUID();
    const operations: PrismaPromise<unknown>[] = [];

    operations.push(
      db.expenseType.create({
        data: {
          id: expenseTypeId,
          userId: session.user.id,
          name,
          monthlyBudget: monthlyBudget ? parseFloat(monthlyBudget) : null,
        }
      })
    );

    if (subcategories && Array.isArray(subcategories) && subcategories.length > 0) {
      operations.push(
        db.expenseSubcategory.createMany({
          data: subcategories.map((sub: { name: string }) => ({
            userId: session.user.id,
            expenseTypeId,
            name: sub.name,
          }))
        })
      );
    }

    await db.$transaction(operations);

    // Re-read outside the transaction
    const result = await db.expenseType.findUnique({
      where: { id: expenseTypeId },
      include: {
        subcategories: {
          orderBy: {
            name: 'asc'
          }
        }
      }
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