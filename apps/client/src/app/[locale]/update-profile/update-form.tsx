"use client";

import { User } from "@/types/apis";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { http } from "@/lib/http";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";

const updateFormSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
});

type UpdateFormValues = z.infer<typeof updateFormSchema>;

export default function UpdateForm() {
  const [profile, setProfile] = React.useState<User | null>(null);
  const form = useForm<UpdateFormValues>({
    resolver: zodResolver(updateFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
    },
  });
  const router = useRouter();

  const onSubmit = async (values: UpdateFormValues) => {
    try {
      await http.put("/api/v1/user/auth/me", {
        firstName: values.firstName,
        lastName: values.lastName,
      });
      toast.success("Profile updated successfully");
      router.push("/server-profile");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update profile");
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    const fetchProfile = async () => {
      try {
        const response = await http.get<User>("/api/v1/user/auth/me", {
          signal,
        });
        setProfile(response.data);
        form.reset({
          firstName: response.data.firstName || "",
          lastName: response.data.lastName || "",
        });
      } catch (error) {
        console.error(">>> Error fetching profile:", error);
      }
    };

    fetchProfile();

    return () => controller.abort();
  }, [form]);

  return (
    <Card className="w-125">
      <CardHeader>
        <CardTitle className="text-2xl">Update Profile</CardTitle>
        <CardDescription>
          Update profile information for {profile?.fullName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter first name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter last name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button className="mt-2 w-full" type="submit">
              Client Update
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
