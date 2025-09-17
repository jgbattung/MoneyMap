import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params } : { params: { id: string } }
) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers()
    }); 

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const incomeType = await db.incomeType.findUnique({
      where: {
        id: id,
        userId: session.user.id,
      },
    });

    if (!incomeType) {
      return NextResponse.json(
        { error: 'Income type not found' },
        { status: 400 }
      );
    }

    return NextResponse.json(incomeType, { status: 200 });
  } catch (error) {
    console.error('Error getting income type: ', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params } : { params: { id: string } }
) {
  try {
    const { id } = await params;

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

    const { name, monthlyTarget } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      );
    }

    const updatedIncomeType = await db.incomeType.update({
      where: {
        id: id,
        userId: session.user.id,
      },
      data: {
        name,
        monthlyTarget: monthlyTarget ? parseFloat(monthlyTarget) : null,
      }
    });

    return NextResponse.json(updatedIncomeType, { status: 200 });

  } catch (error) {
    console.error('Error updating income type: ', error);

    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'An income type with this name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
    request: NextRequest,
  { params } : { params: { id: string } }
) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const existingIncomeType = await db.incomeType.findUnique({
      where: {
        id: id,
        userId: session.user.id
      },
    });

    if (!existingIncomeType) {
      return NextResponse.json(
        { error: 'Income type not found' },
        { status: 404 }
      );
    }

    await db.incomeType.delete({
      where: {
        id: id,
        userId: session.user.id,
      },
    });

    return NextResponse.json(
      { message: 'Income type deleted successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error deleting income type: ', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );  
  }
}