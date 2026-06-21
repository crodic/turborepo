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
import { useForm } from "react-hook-form";
import { z } from "zod";

const updateFormSchema = z.object({
  displayName: z.string().min(2),
});

type UpdateFormValues = z.infer<typeof updateFormSchema>;

export default function UpdateForm() {
  const [profile, setProfile] = React.useState<User | null>(null);
  const form = useForm<UpdateFormValues>({
    resolver: zodResolver(updateFormSchema),
    defaultValues: {
      displayName: "",
    },
  });
  const router = useRouter();

  const onSubmit = async (values: UpdateFormValues) => {
    console.log(values);
    try {
      await http.put("/users/me", { displayName: values.displayName });
      router.push("/server-profile");
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    const fetchProfile = async () => {
      try {
        const response = await http.get<{ user: User }>("/users/me", {
          signal,
        });
        setProfile(response.data.user);
      } catch (error) {
        console.error(">>> Error fetching profile:", error);
      }
    };
    fetchProfile();

    return () => controller.abort();
  }, []);

  return (
    <Card className="w-125">
      <CardHeader>
        <CardTitle className="text-2xl">Change DisplayName</CardTitle>
        <CardDescription>
          Change DisplayName For Account - {profile?.displayName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>DisplayName</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter DisplayName" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button className="mt-2" type="submit">
              Client Update
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
