"use client";

import { CreditCard, LogOut, Settings, User } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const title = "Profile Dropdown with Status";

const UserAccount = () => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button className="relative h-10 w-10 rounded-full" variant="ghost">
        <Avatar>
          <AvatarImage
            alt="@crodic"
            src="https://github.com/haydenbleasel.png"
          />
          <AvatarFallback>CD</AvatarFallback>
        </Avatar>
        <span className="ring-background absolute right-0 bottom-0 h-3 w-3 rounded-full bg-green-500 ring-2" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-64">
      <DropdownMenuLabel className="font-normal">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage
              alt="@crodic"
              src="https://github.com/haydenbleasel.png"
            />
            <AvatarFallback>CD</AvatarFallback>
          </Avatar>
          <div className="flex flex-col space-y-1">
            <p className="text-sm leading-none font-medium">Crodic Crystal</p>
            <p className="text-muted-foreground text-xs leading-none">
              alice01422@gmail.com
            </p>
            <Badge className="w-fit text-xs" variant="secondary">
              Pro
            </Badge>
          </div>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem>
        <User />
        View Profile
      </DropdownMenuItem>
      <DropdownMenuItem>
        <CreditCard />
        Billing
      </DropdownMenuItem>
      <DropdownMenuItem>
        <Settings />
        Account Settings
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive">
        <LogOut />
        Log out
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

export default UserAccount;
