import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

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

    const accounts = await db.financialAccount.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        currentBalance: 'desc',
      },
    });

    return NextResponse.json(accounts, { status: 200 });

  } catch (error) {
    console.error('Error getting account: ', error);
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

    const { name, accountType, initialBalance, addToNetWorth, statementDate, dueDate } = body;

    if (!name || !accountType || initialBalance === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name, accountType, initialBalance' },
        { status: 400 }
      );
    }

    const account = await db.financialAccount.create({
      data: {
        userId: session.user.id,
        name,
        accountType,
        initialBalance: parseFloat(initialBalance),
        currentBalance: parseFloat(initialBalance),
        addToNetWorth: addToNetWorth ?? true,
        statementDate: statementDate ? parseInt(statementDate) : null,
        dueDate: dueDate ? parseInt(dueDate) : null,
      },
    });

    return NextResponse.json(account, { status: 201 });

  } catch (error) {
    console.error('Error creating account: ', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}