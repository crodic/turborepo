import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function DeleteAccount() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Delete Your Account</CardTitle>
      </CardHeader>
      <CardContent>
        You can do 'Disable account' to take a break from panel.
      </CardContent>
      <CardFooter>
        <Button variant='destructive'>Coming soon...</Button>
      </CardFooter>
    </Card>
  )
}
