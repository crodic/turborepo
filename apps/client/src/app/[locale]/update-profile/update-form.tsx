"use client";

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
import { User } from "@/types/apis";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const updateProfileSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(100, "First name must be less than 100 characters"),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(100, "Last name must be less than 100 characters"),
});

type UpdateProfileValues = z.infer<typeof updateProfileSchema>;

export default function UpdateForm() {
  const [profile, setProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const form = useForm<UpdateProfileValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
    },
  });

  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      try {
        const response = await http.get<User>("/api/v1/user/auth/me");
        if (!isMounted) return;

        setProfile(response.data);
        form.reset({
          firstName: response.data.firstName || "",
          lastName: response.data.lastName || "",
        });
      } catch {
        if (!isMounted) return;
        toast.error("Failed to load profile details.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [form]);

  const onSubmit = async (values: UpdateProfileValues) => {
    try {
      await http.put("/api/v1/user/auth/me", {
        firstName: values.firstName,
        lastName: values.lastName,
      });

      toast.success("Profile updated successfully.");
      router.push("/client-profile");
    } catch {
      toast.error("Failed to update profile. Please try again.");
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Update Profile</CardTitle>
        <CardDescription>
          {profile?.email
            ? `Manage your personal details for ${profile.email}`
            : "Update your personal details"}
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
                  <FormLabel>First name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your first name"
                      disabled={isLoading || form.formState.isSubmitting}
                      {...field}
                    />
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
                  <FormLabel>Last name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your last name"
                      disabled={isLoading || form.formState.isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="submit"
                disabled={isLoading || form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Saving..." : "Save changes"}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/client-profile">Cancel</Link>
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
