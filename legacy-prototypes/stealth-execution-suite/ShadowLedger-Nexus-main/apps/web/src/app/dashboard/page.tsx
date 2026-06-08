// Built by vsrupeshkumar
"use client";

export const dynamic = 'force-dynamic';

import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { CommandCenter } from '@/components/dashboard/CommandCenter';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <CommandCenter />
    </DashboardLayout>
  );
}
