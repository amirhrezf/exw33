"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Receipt, Edit2, Trash2, Sparkles } from 'lucide-react'
import { useCurrencyStore } from '@/lib/store'
import { TransactionModal, TransactionFormData, categoryConfig } from '@/components/transactions/transaction-modal'
import { AddWithAiModal } from '@/components/transactions/add-with-ai-modal'
import { createTransaction, updateTransaction, deleteTransaction, getTransactions, getMonthlyTotal } from '@/lib/actions/transactions'
import { format, isSameDay, startOfMonth, endOfMonth } from 'date-fns'

interface Transaction {
  id: string
  name: string
  amount: number
  category: string
  date: Date
  createdAt: Date
  updatedAt: Date
}

export default function RecordsPage() {
  const { formatAmount } = useCurrencyStore()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [monthlyTotal, setMonthlyTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)

  useEffect(() => {
    loadTransactions()
  }, [])

  const handleGenerateDemoData = async () => {
    if (confirm('This will add 15 demo transactions for November. Continue?')) {
      try {
        const demoTransactions = generateDemoTransactions()
        let successCount = 0

        for (const transaction of demoTransactions) {
          const result = await createTransaction(transaction)
          if (result.success) {
            successCount++
          }
        }

        alert(`Successfully added ${successCount} demo transactions!`)
        await loadTransactions() // Reload data
      } catch (error) {
        console.error('Failed to generate demo data:', error)
        alert('Failed to generate demo data. Please check the console for details.')
      }
    }
  }

  const generateDemoTransactions = (): TransactionFormData[] => {
    const currentYear = new Date().getFullYear()
    const transactions: TransactionFormData[] = []

    // Sample transaction names for each category
    const transactionNames = {
      Food: ['Starbucks Coffee', 'Lunch at Cafe', 'Dinner at Restaurant', 'Fast Food', 'Grocery Store Meal'],
      Groceries: ['Weekly Groceries', 'Fresh Produce', 'Dairy Products', 'Bakery Items', 'Snacks'],
      Transportation: ['Uber Ride', 'Gas Station', 'Bus Ticket', 'Train Pass', 'Parking Fee'],
      Internet: ['Monthly Internet Bill', 'Data Plan', 'WiFi Hotspot', 'Streaming Service'],
      Health: ['Doctor Visit', 'Pharmacy', 'Dental Checkup', 'Health Insurance', 'Vitamins'],
      Sport: ['Gym Membership', 'Running Shoes', 'Yoga Class', 'Sports Equipment', 'Personal Trainer'],
      Shopping: ['Clothing Store', 'Electronics', 'Home Goods', 'Books', 'Online Purchase'],
      Entertainment: ['Movie Tickets', 'Concert', 'Streaming Subscription', 'Games', 'Theater'],
      BadHabits: ['Cigarettes', 'Alcohol', 'Energy Drinks', 'Fast Food Habit', 'Coffee Addiction'],
      Other: ['Gift Purchase', 'Donation', 'Bank Fee', 'Miscellaneous', 'Unexpected Expense']
    }

    // Generate 15 transactions for November
    for (let i = 0; i < 15; i++) {
      // Random day in November (1-30)
      const day = Math.floor(Math.random() * 30) + 1
      const date = new Date(currentYear, 10, day) // November is month 10 (0-indexed)

      // Random category
      const categoryIndex = Math.floor(Math.random() * categoryConfig.length)
      const category = categoryConfig[categoryIndex]

      // Random name from the category's names
      const names = transactionNames[category.value as keyof typeof transactionNames]
      const name = names[Math.floor(Math.random() * names.length)]

      // Random amount (realistic ranges per category)
      let minAmount = 5
      let maxAmount = 50

      switch (category.value) {
        case 'Food':
          minAmount = 8
          maxAmount = 45
          break
        case 'Groceries':
          minAmount = 25
          maxAmount = 150
          break
        case 'Transportation':
          minAmount = 5
          maxAmount = 35
          break
        case 'Internet':
          minAmount = 50
          maxAmount = 80
          break
        case 'Health':
          minAmount = 15
          maxAmount = 200
          break
        case 'Sport':
          minAmount = 20
          maxAmount = 100
          break
        case 'Shopping':
          minAmount = 30
          maxAmount = 300
          break
        case 'Entertainment':
          minAmount = 15
          maxAmount = 120
          break
        case 'BadHabits':
          minAmount = 5
          maxAmount = 25
          break
        case 'Other':
          minAmount = 10
          maxAmount = 100
          break
      }

      const amount = (Math.random() * (maxAmount - minAmount) + minAmount).toFixed(2)

      transactions.push({
        name,
        amount,
        category: category.value,
        date
      })
    }

    return transactions
  }

  const loadTransactions = async () => {
    try {
      const [transactionsResult, totalResult] = await Promise.all([
        getTransactions(),
        getMonthlyTotal()
      ])

      if (transactionsResult.success) {
        // Convert Decimal amounts to numbers for the frontend
        const convertedTransactions = transactionsResult.transactions.map(t => ({
          ...t,
          amount: Number(t.amount),
          date: new Date(t.date),
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt),
        }))
        setTransactions(convertedTransactions)
      }
      if (totalResult.success) {
        setMonthlyTotal(Number(totalResult.total))
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddTransaction = () => {
    setEditingTransaction(null)
    setIsModalOpen(true)
  }

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setIsModalOpen(true)
  }

  const handleDeleteTransaction = async (id: string) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      try {
        const result = await deleteTransaction(id)
        if (result.success) {
          await loadTransactions() // Reload data
        } else {
          alert('Failed to delete transaction')
        }
      } catch (error) {
        console.error('Failed to delete transaction:', error)
        alert('Failed to delete transaction')
      }
    }
  }

  const handleSubmitTransaction = async (data: TransactionFormData) => {
    try {
      if (editingTransaction) {
        const result = await updateTransaction(editingTransaction.id, data)
        if (!result.success) {
          alert(result.error || 'Failed to update transaction')
          return
        }
      } else {
        const result = await createTransaction(data)
        if (!result.success) {
          alert(result.error || 'Failed to create transaction')
          return
        }
      }
      await loadTransactions() // Reload data
    } catch (error) {
      console.error('Failed to save transaction:', error)
      alert('Failed to save transaction. Please check the console for details.')
    }
  }

  // Group transactions by date
  const groupedTransactions = transactions.reduce((groups, transaction) => {
    const dateKey = format(new Date(transaction.date), 'yyyy-MM-dd')
    if (!groups[dateKey]) {
      groups[dateKey] = []
    }
    groups[dateKey].push(transaction)
    return groups
  }, {} as Record<string, Transaction[]>)

  // Filter transactions based on search query
  const filteredGroups = Object.entries(groupedTransactions).reduce((filtered, [dateKey, transactions]) => {
    const filteredTransactions = transactions.filter(transaction =>
      transaction.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.category.toLowerCase().includes(searchQuery.toLowerCase())
    )
    if (filteredTransactions.length > 0) {
      filtered[dateKey] = filteredTransactions
    }
    return filtered
  }, {} as Record<string, Transaction[]>)

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-12 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-serif">Records</h1>
            <p className="text-muted-foreground">Track your expenses</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleGenerateDemoData} variant="outline" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Generate Demo
            </Button>
            <AddWithAiModal 
              onTransactionSaved={loadTransactions} 
              onSubmitTransaction={handleSubmitTransaction}
            />
            <Button onClick={handleAddTransaction} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Transaction
            </Button>
          </div>
        </div>

        {/* Monthly Summary */}
        <Card>
          <CardHeader>
            <CardTitle>{format(new Date(), 'MMMM yyyy')}</CardTitle>
            <CardDescription>Monthly spending summary</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {formatAmount(monthlyTotal)}
            </div>
            <p className="text-sm text-muted-foreground">Total spent this month</p>
          </CardContent>
        </Card>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search transactions..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Transaction List */}
        {Object.keys(filteredGroups).length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Recent Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No transactions yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start tracking your expenses by adding your first transaction.
                </p>
                <Button onClick={handleAddTransaction}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Transaction
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(filteredGroups)
              .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
              .map(([dateKey, dayTransactions]) => {
                const dailyTotal = dayTransactions.reduce((sum, t) => sum + t.amount, 0)
                const date = new Date(dateKey)

                return (
                  <Card key={dateKey}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          {format(date, 'EEEE, MMMM d, yyyy')}
                        </CardTitle>
                        <div className="text-right">
                          <div className="text-sm font-medium text-muted-foreground">Daily Total</div>
                          <div className="text-lg font-semibold text-primary">
                            {formatAmount(dailyTotal)}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <AnimatePresence>
                        {dayTransactions.map((transaction, index) => (
                          <motion.div
                            key={transaction.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 group"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              {(() => {
                                const category = categoryConfig.find(c => c.value === transaction.category)
                                if (category) {
                                  const Icon = category.icon
                                  return <Icon className="w-5 h-5 text-muted-foreground" />
                                }
                                return null
                              })()}
                              <div>
                                <div className="font-medium">{transaction.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {transaction.category}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="font-semibold">
                                  {formatAmount(transaction.amount)}
                                </div>
                              </div>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditTransaction(transaction)}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteTransaction(transaction.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                )
              })}
          </div>
        )}
      </motion.div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitTransaction}
        initialData={editingTransaction ? {
          name: editingTransaction.name,
          amount: editingTransaction.amount.toString(),
          category: editingTransaction.category,
          date: new Date(editingTransaction.date),
        } : undefined}
        isEditing={!!editingTransaction}
      />
    </div>
  )
}
