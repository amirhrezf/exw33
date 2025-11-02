"use client"

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  CalendarIcon,
  UtensilsCrossed,
  ShoppingCart,
  Car,
  Wifi,
  Heart,
  Dumbbell,
  ShoppingBag,
  Film,
  Cigarette,
  CircleDot,
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export type TransactionFormData = {
  name: string
  amount: string
  category: string
  date: Date
}

export const categoryConfig = [
  { value: 'Food', label: 'Food', icon: UtensilsCrossed },
  { value: 'Groceries', label: 'Groceries', icon: ShoppingCart },
  { value: 'Transportation', label: 'Transportation', icon: Car },
  { value: 'Internet', label: 'Internet', icon: Wifi },
  { value: 'Health', label: 'Health', icon: Heart },
  { value: 'Sport', label: 'Sport', icon: Dumbbell },
  { value: 'Shopping', label: 'Shopping', icon: ShoppingBag },
  { value: 'Entertainment', label: 'Entertainment', icon: Film },
  { value: 'BadHabits', label: 'Bad Habits', icon: Cigarette },
  { value: 'Other', label: 'Other', icon: CircleDot },
] as const

type Category = typeof categoryConfig[number]['value']

interface TransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: TransactionFormData) => void
  initialData?: Partial<TransactionFormData>
  isEditing?: boolean
  onSaveSuccess?: () => void
}

export function TransactionModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isEditing = false,
  onSaveSuccess
}: TransactionModalProps) {
  const [formData, setFormData] = useState<TransactionFormData>({
    name: initialData?.name || '',
    amount: initialData?.amount || '',
    category: initialData?.category || 'Food',
    date: initialData?.date || new Date(),
  })

  // Update form data when initialData changes (for AI pre-fill)
  React.useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
        name: initialData.name || '',
        amount: initialData.amount || '',
        category: initialData.category || 'Food',
        date: initialData.date || new Date(),
      })
    }
  }, [isOpen, initialData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.amount) return

    onSubmit(formData)
    onClose()
    
    // Call success callback if provided (for AI modal chaining)
    if (onSaveSuccess) {
      onSaveSuccess()
    }
    
    // Reset form
    setFormData({
      name: '',
      amount: '',
      category: 'Food',
      date: new Date(),
    })
  }

  const handleClose = () => {
    onClose()
    // Reset form when closing
    setFormData({
      name: '',
      amount: '',
      category: 'Food',
      date: new Date(),
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Transaction' : 'Add Transaction'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Input */}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g., Coffee, Bus ticket"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              required
            />
          </div>

          {/* Category Select */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as Category }))}
            >
              <SelectTrigger id="category" className="w-full">
                <div className="flex items-center gap-2">
                  {(() => {
                    const category = categoryConfig.find(c => c.value === formData.category)
                    if (category) {
                      const Icon = category.icon
                      return (
                        <>
                          <Icon className="w-4 h-4" />
                          <SelectValue>{category.label}</SelectValue>
                        </>
                      )
                    }
                    return <SelectValue>{formData.category}</SelectValue>
                  })()}
                </div>
              </SelectTrigger>
              <SelectContent>
                {categoryConfig.map((category) => {
                  const Icon = category.icon
                  return (
                    <SelectItem key={category.value} value={category.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <span>{category.label}</span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Date Picker */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.date ? format(formData.date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.date}
                  onSelect={(date) => {
                    if (date) {
                      setFormData(prev => ({ ...prev, date }))
                    }
                  }}
                  defaultMonth={formData.date}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit">
              {isEditing ? 'Update' : 'Add'} Transaction
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
