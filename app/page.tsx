'use client';

import { MonthSelector } from '@/components/schedule/MonthSelector';
import { ScheduleTable } from '@/components/schedule/ScheduleTable';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { Summary } from '@/components/summary/Summary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DoctorList } from '@/components/doctors/DoctorList';
import { ErrorPanel } from '@/components/schedule/ErrorPanel';
import { ExportButtons } from '@/components/schedule/ExportButtons';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-[1600px] mx-auto">
          <h1 className="text-xl font-bold text-gray-900">Laima</h1>
          <p className="text-sm text-muted-foreground">Neurochirurgijos klinikos budėjimų grafikas</p>
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
