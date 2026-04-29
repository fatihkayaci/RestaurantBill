import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChefHat, CheckCircle2 } from 'lucide-react'
import type { Order } from '@/features/order/types'

interface OrderCardProps {
  order: Order
  showAcceptButton?: boolean
  showReadyButton?: boolean
  onAccept?: (orderId: number) => void
  onReady?: (orderId: number) => void
}

function OrderCard({ order, showAcceptButton, showReadyButton, onAccept, onReady }: OrderCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Table {order.tableId}</CardTitle>
          <span className="text-sm text-muted-foreground font-mono">#{order.id}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-4">
          {order.orderItems.map((item, idx) => (
            <div
              key={idx}
              className="flex items-start justify-between py-2 border-b last:border-0"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                  {item.quantity}
                </span>
                <span className="font-medium">{item.productName}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          {showAcceptButton && (
            <Button className="flex-1 gap-2" onClick={() => onAccept?.(order.id)}>
              <ChefHat className="h-4 w-4" />
              Start Preparing
            </Button>
          )}
          {showReadyButton && (
            <Button className="flex-1 gap-2" variant="secondary" onClick={() => onReady?.(order.id)}>
              <CheckCircle2 className="h-4 w-4" />
              Mark Ready
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default OrderCard
