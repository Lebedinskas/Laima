'use client';

import { useAuth } from '@/hooks/useAuth';
import { useSupabaseSync } from '@/hooks/useSupabaseSync';
import { LoginPage } from '@/components/auth/LoginPage';
import { MonthSelector } from '@/components/schedule/MonthSelector';
import { ScheduleTable } from '@/components/schedule/ScheduleTable';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { Summary } from '@/components/summary/Summary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DoctorList } from '@/components/doctors/DoctorList';
import { ErrorPanel } from '@/components/schedule/ErrorPanel';
import { ExportButtons } from '@/components/schedule/ExportButtons';
import { Clock } from '@/components/Clock';
import { DoctorAnalytics } from '@/components/analytics/DoctorAnalytics';
import { RulesPanel } from '@/components/settings/RulesPanel';
import { Button } from '@/components/ui/button';

export default function Home() {
  const { user, loading, signOut } = useAuth();
  useSupabaseSync();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium text-gray-700">Kraunasi...</div>
          <p className="text-sm text-muted-foreground mt-1">Laima</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Laima</h1>
            <p className="text-sm text-muted-foreground">Neurochirurgijos klinikos budėjimų grafikas</p>
          </div>
          <div className="flex items-center gap-4">
            <Clock />
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium text-blue-800">{user.email}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Atsijungti
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
          <div className="space-y-6">
            <div className="bg-white rounded-lg border p-4 flex items-end justify-between gap-4 flex-wrap">
              <MonthSelector />
              <ExportButtons />
            </div>

            <Tabs defaultValue="schedule">
              <TabsList>
                <TabsTrigger value="schedule">Grafikas</TabsTrigger>
                <TabsTrigger value="doctors">Gydytojai</TabsTrigger>
                <TabsTrigger value="analytics">Analizė</TabsTrigger>
                <TabsTrigger value="rules">Taisyklės</TabsTrigger>
              </TabsList>
              <TabsContent value="schedule" className="mt-4">
                <div className="bg-white rounded-lg border p-4">
                  <ScheduleTable />
                </div>
                <ErrorPanel />
              </TabsContent>
              <TabsContent value="doctors" className="mt-4">
                <div className="bg-white rounded-lg border p-4">
                  <DoctorList />
                </div>
              </TabsContent>
              <TabsContent value="analytics" className="mt-4">
                <DoctorAnalytics />
              </TabsContent>
              <TabsContent value="rules" className="mt-4">
                <div className="bg-white rounded-lg border p-4">
                  <RulesPanel />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-4">
            <div className="h-[500px]">
              <ChatPanel />
            </div>
            <div className="bg-white rounded-lg border p-4">
              <Summary />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
