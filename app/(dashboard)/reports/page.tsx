"use client"

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart3, PieChart, TrendingUp, CalendarIcon } from 'lucide-react'
import { useCurrencyStore } from '@/lib/store'
import { getTransactionsByDateRange } from '@/lib/actions/transactions'
import { categoryConfig } from '@/components/transactions/transaction-modal'
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear,
  subMonths,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  addDays,
  addWeeks,
  addMonths
} from 'date-fns'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { PieChart as RechartsPieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'

interface Transaction {
  id: string
  name: string
  amount: number
  category: string
  date: Date
  createdAt: Date
  updatedAt: Date
}

type TimePeriod = 'thisMonth' | 'last3Months' | 'thisYear' | 'custom'

const COLORS = [
  'oklch(0.7357 0.1641 34.7091)',
  'oklch(0.8278 0.1131 57.9984)',
  'oklch(0.8773 0.0763 54.9314)',
  'oklch(0.8200 0.1054 40.8859)',
  'oklch(0.6368 0.1306 32.0721)',
  'oklch(0.7357 0.1641 34.7091)',
  'oklch(0.8278 0.1131 57.9984)',
  'oklch(0.8773 0.0763 54.9314)',
  'oklch(0.8200 0.1054 40.8859)',
  'oklch(0.6368 0.1306 32.0721)',
]

export default function ReportsPage() {
  const { formatAmount } = useCurrencyStore()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('thisMonth')
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined)
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined)
  const [customRangeOpen, setCustomRangeOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Calculate date range based on selected period
  const { startDate, endDate } = useMemo(() => {
    const now = new Date()
    
    switch (selectedPeriod) {
      case 'thisMonth':
        return {
          startDate: startOfMonth(now),
          endDate: endOfMonth(now)
        }
      case 'last3Months':
        return {
          startDate: startOfMonth(subMonths(now, 2)),
          endDate: endOfMonth(now)
        }
      case 'thisYear':
        return {
          startDate: startOfYear(now),
          endDate: endOfYear(now)
        }
      case 'custom':
        return {
          startDate: customStartDate || now,
          endDate: customEndDate || now
        }
      default:
        return {
          startDate: startOfMonth(now),
          endDate: endOfMonth(now)
        }
    }
  }, [selectedPeriod, customStartDate, customEndDate])

  useEffect(() => {
    loadTransactions()
  }, [startDate, endDate])

  const loadTransactions = async () => {
    setIsLoading(true)
    try {
      const result = await getTransactionsByDateRange(startDate, endDate)
      if (result.success) {
        const convertedTransactions = result.transactions.map((t: any) => ({
          ...t,
          date: new Date(t.date),
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt),
        }))
        setTransactions(convertedTransactions)
      }
    } catch (error) {
      console.error('Failed to load transactions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCustomRangeApply = () => {
    if (customStartDate && customEndDate && customStartDate <= customEndDate) {
      setSelectedPeriod('custom')
      setCustomRangeOpen(false)
    }
  }

  // Group transactions by category
  const categoryData = useMemo(() => {
    const grouped = transactions.reduce((acc, transaction) => {
      const category = transaction.category
      if (!acc[category]) {
        acc[category] = 0
      }
      acc[category] += transaction.amount
      return acc
    }, {} as Record<string, number>)

    return Object.entries(grouped)
      .map(([category, total]) => {
        const config = categoryConfig.find(c => c.value === category)
        return {
          category,
          label: config?.label || category,
          value: total,
          fill: COLORS[categoryConfig.findIndex(c => c.value === category) % COLORS.length]
        }
      })
      .sort((a, b) => b.value - a.value)
  }, [transactions])

  // Group transactions by time period for trend
  const trendData = useMemo(() => {
    if (transactions.length === 0) return []

    const period = selectedPeriod
    let intervals: Date[]
    let formatFn: (date: Date) => string

    if (period === 'thisMonth') {
      intervals = eachDayOfInterval({ start: startDate, end: endDate })
      formatFn = (date) => format(date, 'MMM d')
    } else if (period === 'last3Months') {
      intervals = eachWeekOfInterval({ start: startDate, end: endDate })
      formatFn = (date) => format(date, 'MMM d')
    } else {
      intervals = eachMonthOfInterval({ start: startDate, end: endDate })
      formatFn = (date) => format(date, 'MMM yyyy')
    }

    const grouped = intervals.map(interval => {
      const intervalStart = interval
      const intervalEnd = period === 'thisMonth' 
        ? addDays(intervalStart, 1)
        : period === 'last3Months'
        ? addWeeks(intervalStart, 1)
        : addMonths(intervalStart, 1)

      const amount = transactions
        .filter(t => {
          const tDate = new Date(t.date)
          return tDate >= intervalStart && tDate < intervalEnd
        })
        .reduce((sum, t) => sum + t.amount, 0)

      return {
        date: formatFn(interval),
        amount: amount
      }
    })

    return grouped
  }, [transactions, selectedPeriod, startDate, endDate])

  // Top expenses
  const topExpenses = useMemo(() => {
    return [...transactions]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
  }, [transactions])

  const chartConfig: ChartConfig = useMemo(() => {
    const config: ChartConfig = {}
    categoryConfig.forEach((cat, index) => {
      config[cat.value] = {
        label: cat.label,
        color: COLORS[index % COLORS.length]
      }
    })
    return config
  }, [])

  const totalSpending = transactions.reduce((sum, t) => sum + t.amount, 0)

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold font-serif">Reports</h1>
          <p className="text-muted-foreground">Analyze your spending patterns</p>
        </div>

        {/* Date Range Filter */}
        <Card>
          <CardHeader>
            <CardTitle>Time Period</CardTitle>
            <CardDescription>Select a date range for your reports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedPeriod === 'thisMonth' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriod('thisMonth')}
              >
                This Month
              </Button>
              <Button
                variant={selectedPeriod === 'last3Months' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriod('last3Months')}
              >
                Last 3 Months
              </Button>
              <Button
                variant={selectedPeriod === 'thisYear' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriod('thisYear')}
              >
                This Year
              </Button>
              <Popover open={customRangeOpen} onOpenChange={setCustomRangeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={selectedPeriod === 'custom' ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      "justify-start text-left font-normal",
                      !customStartDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customStartDate && customEndDate
                      ? `${format(customStartDate, 'MMM d')} - ${format(customEndDate, 'MMM d')}`
                      : 'Custom Range'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="p-4 space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Start Date</label>
                      <Calendar
                        mode="single"
                        selected={customStartDate}
                        onSelect={setCustomStartDate}
                        initialFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">End Date</label>
                      <Calendar
                        mode="single"
                        selected={customEndDate}
                        onSelect={setCustomEndDate}
                        disabled={(date) => customStartDate ? date < customStartDate : false}
                      />
                    </div>
                    <Button
                      onClick={handleCustomRangeApply}
                      disabled={!customStartDate || !customEndDate || customStartDate > customEndDate}
                      className="w-full"
                    >
                      Apply Range
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              {format(startDate, 'MMM d, yyyy')} - {format(endDate, 'MMM d, yyyy')} • Total: {mounted ? formatAmount(totalSpending) : '$0.00'}
            </div>
          </CardContent>
        </Card>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Spending by Category */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Spending by Category
                </CardTitle>
                <CardDescription>
                  Breakdown of expenses by category
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="animate-pulse text-muted-foreground">Loading...</div>
                  </div>
                ) : categoryData.length === 0 ? (
                  <div className="text-center py-12">
                    <PieChart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No data available. Add some transactions to see your spending breakdown.
                    </p>
                  </div>
                ) : (
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <RechartsPieChart>
                      <ChartTooltip content={<ChartTooltipContent nameKey="category" />} />
                      <ChartLegend content={<ChartLegendContent nameKey="category" payload={[]} />} />
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(props: any) => {
                          const { percent } = props;
                          return percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : '';
                        }}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="category"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                    </RechartsPieChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Spending Trend */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Spending Trend
                </CardTitle>
                <CardDescription>
                  Your spending over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="animate-pulse text-muted-foreground">Loading...</div>
                  </div>
                ) : trendData.length === 0 || trendData.every(d => d.amount === 0) ? (
                  <div className="text-center py-12">
                    <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No data available. Add some transactions to see your spending trends.
                    </p>
                  </div>
                ) : (
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="oklch(0.7357 0.1641 34.7091)" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="oklch(0.7357 0.1641 34.7091)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="date" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickFormatter={(value) => mounted ? formatAmount(value) : `$${value.toFixed(2)}`}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent formatter={(value) => mounted ? formatAmount(Number(value)) : `$${Number(value).toFixed(2)}`} />}
                      />
                      <Area
                        type="monotone"
                        dataKey="amount"
                        stroke="oklch(0.7357 0.1641 34.7091)"
                        fillOpacity={1}
                        fill="url(#colorAmount)"
                      />
                    </AreaChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Top Expenses */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Top Expenses
              </CardTitle>
              <CardDescription>
                Your biggest transactions in the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-12 flex items-center justify-center">
                  <div className="animate-pulse text-muted-foreground">Loading...</div>
                </div>
              ) : topExpenses.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No transactions found for the selected period.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {topExpenses.map((transaction, index) => {
                      const category = categoryConfig.find(c => c.value === transaction.category)
                      const Icon = category?.icon || categoryConfig[categoryConfig.length - 1].icon
                      
                      return (
                        <motion.div
                          key={transaction.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <Icon className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{transaction.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {category?.label || transaction.category} • {format(new Date(transaction.date), 'MMM d, yyyy')}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{mounted ? formatAmount(transaction.amount) : `$${transaction.amount.toFixed(2)}`}</div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}
