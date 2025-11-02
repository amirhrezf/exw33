'use server'

import { auth } from '@clerk/nextjs/server'
import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export type TransactionFormData = {
  name: string
  amount: string
  category: string
  date: Date
}

// Helper function to convert Decimal to number for serialization
function serializeTransaction(transaction: any) {
  return {
    ...transaction,
    amount: Number(transaction.amount),
    date: new Date(transaction.date),
    createdAt: new Date(transaction.createdAt),
    updatedAt: new Date(transaction.updatedAt),
  }
}

// Helper function to ensure user exists in database
async function ensureUser(userId: string) {
  try {
    const user = await currentUser()
    
    const dbUser = await prisma.user.upsert({
      where: { id: userId },
      update: {
        email: user?.emailAddresses[0]?.emailAddress || '',
        name: user?.fullName || null,
      },
      create: {
        id: userId,
        email: user?.emailAddresses[0]?.emailAddress || '',
        name: user?.fullName || null,
        currency: 'USD',
      },
    })
    
    return dbUser
  } catch (error) {
    console.error('Error ensuring user exists:', error)
    throw new Error('Failed to create user record')
  }
}

export async function createTransaction(data: TransactionFormData) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return { success: false, error: 'Unauthorized: Please sign in' }
    }

    // Ensure user exists in database
    await ensureUser(userId)

    const amount = parseFloat(data.amount)
    if (isNaN(amount) || amount <= 0) {
      return { success: false, error: 'Invalid amount: Please enter a valid positive number' }
    }

    // Validate category
    const validCategories = ['Food', 'Groceries', 'Transportation', 'Internet', 'Health', 'Sport', 'Shopping', 'Entertainment', 'BadHabits', 'Other']
    if (!validCategories.includes(data.category)) {
      return { success: false, error: `Invalid category: ${data.category}` }
    }

    const transaction = await prisma.transaction.create({
      data: {
        name: data.name.trim(),
        amount: amount,
        category: data.category as any,
        date: data.date,
        userId: userId,
      },
    })

    revalidatePath('/records')
    return { success: true, transaction: serializeTransaction(transaction) }
  } catch (error: any) {
    console.error('Error creating transaction:', error)
    const errorMessage = error?.message || 'Unknown error occurred'
    return { success: false, error: `Failed to create transaction: ${errorMessage}` }
  }
}

export async function updateTransaction(id: string, data: TransactionFormData) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return { success: false, error: 'Unauthorized' }
    }

    const amount = parseFloat(data.amount)
    if (isNaN(amount) || amount <= 0) {
      return { success: false, error: 'Invalid amount' }
    }

    const transaction = await prisma.transaction.update({
      where: {
        id: id,
        userId: userId,
      },
      data: {
        name: data.name.trim(),
        amount: amount,
        category: data.category as any,
        date: data.date,
      },
    })

    revalidatePath('/records')
    return { success: true, transaction: serializeTransaction(transaction) }
  } catch (error: any) {
    console.error('Error updating transaction:', error)
    return { success: false, error: `Failed to update transaction: ${error.message || 'Unknown error'}` }
  }
}

export async function deleteTransaction(id: string) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return { success: false, error: 'Unauthorized' }
    }

    await prisma.transaction.delete({
      where: {
        id: id,
        userId: userId,
      },
    })

    revalidatePath('/records')
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting transaction:', error)
    return { success: false, error: `Failed to delete transaction: ${error.message || 'Unknown error'}` }
  }
}

export async function getTransactions() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return { success: false, error: 'Unauthorized', transactions: [] }
    }

    // Ensure user exists
    await ensureUser(userId)

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        date: 'desc',
      },
    })

    // Convert Decimal amounts to numbers for client serialization
    const serializedTransactions = transactions.map(serializeTransaction)

    return { success: true, transactions: serializedTransactions }
  } catch (error: any) {
    console.error('Error fetching transactions:', error)
    return { success: false, error: `Failed to fetch transactions: ${error.message || 'Unknown error'}`, transactions: [] }
  }
}

export async function getMonthlyTotal(month?: Date) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return { success: false, error: 'Unauthorized', total: 0 }
    }

    // Ensure user exists
    await ensureUser(userId)

    const targetMonth = month || new Date()
    const startOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1)
    const endOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0)

    const result = await prisma.transaction.aggregate({
      where: {
        userId: userId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      _sum: {
        amount: true,
      },
    })

    // Convert Decimal to number for serialization
    const total = result._sum.amount ? Number(result._sum.amount) : 0

    return { success: true, total }
  } catch (error: any) {
    console.error('Error fetching monthly total:', error)
    return { success: false, error: `Failed to fetch monthly total: ${error.message || 'Unknown error'}`, total: 0 }
  }
}

export async function getTransactionsByDateRange(startDate: Date, endDate: Date) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return { success: false, error: 'Unauthorized', transactions: [] }
    }

    // Ensure user exists
    await ensureUser(userId)

    // Set time to start of day for startDate and end of day for endDate
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: userId,
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: {
        date: 'desc',
      },
    })

    // Convert Decimal amounts to numbers for client serialization
    const serializedTransactions = transactions.map(serializeTransaction)

    return { success: true, transactions: serializedTransactions }
  } catch (error: any) {
    console.error('Error fetching transactions by date range:', error)
    return { success: false, error: `Failed to fetch transactions: ${error.message || 'Unknown error'}`, transactions: [] }
  }
}