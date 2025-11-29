import React from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Construction } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PlaceholderPageProps {
  title: string;
  description?: string;
  icon?: string;
  backLink?: string;
}

export function PlaceholderPage({
  title,
  description = 'This page is under construction and will be available soon.',
  icon = '🚧',
  backLink = '/dashboard',
}: PlaceholderPageProps) {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Link href={backLink}>
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft size={16} />
            Back
          </Button>
        </Link>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 text-6xl">{icon}</div>
          <CardTitle className="text-3xl">{title}</CardTitle>
          <CardDescription className="text-base mt-2">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="flex items-center justify-center gap-2 text-slate-500 mb-6">
            <Construction size={20} />
            <span>Coming Soon</span>
          </div>
          <p className="text-sm text-slate-600 mb-6">
            This feature is currently in development. Check back soon for updates!
          </p>
          <Link href={backLink}>
            <Button>Return to Dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
