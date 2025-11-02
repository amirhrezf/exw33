"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { Receipt, BarChart3, User } from "lucide-react"
import { cn } from "@/lib/utils"

const navigation = [
  {
    name: "Records",
    href: "/records",
    icon: Receipt,
  },
  {
    name: "Reports", 
    href: "/reports",
    icon: BarChart3,
  },
  {
    name: "Profile",
    href: "/profile", 
    icon: User,
  },
]

export function BottomDock() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t border-border">
      <div className="flex items-center justify-around px-4 py-2 max-w-md mx-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center p-2 rounded-lg transition-colors",
                "min-w-[64px] min-h-[64px]",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-primary/10 rounded-lg"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                  }}
                />
              )}
              <Icon className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
