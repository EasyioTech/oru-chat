import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { r2, R2_BUCKET_NAME } from "@/lib/r2";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { format } from "date-fns";

// Mock formatter for bytes
function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export const dynamic = 'force-dynamic'; // Ensure no caching for metrics

export default async function MetricsPage() {
    // 1. Fetch Workspaces
    const allWorkspaces = await db.select().from(workspaces);

    // 2. Fetch R2 Usage
    // Note: This lists ALL objects. In a huge production app, this would be paginated and slow.
    // For "testing/metrics" page it's fine.
    let totalSize = 0;
    const workspaceUsage: Record<string, number> = {};

    try {
        let isTruncated = true;
        let continuationToken: string | undefined = undefined;

        while (isTruncated) {
            const command = new ListObjectsV2Command({
                Bucket: R2_BUCKET_NAME,
                Prefix: "workspaces/", // Only scan workspace files
                ContinuationToken: continuationToken,
            });
            const response = await r2.send(command);

            response.Contents?.forEach((obj) => {
                const size = obj.Size || 0;
                totalSize += size;

                // Key format: workspaces/{workspaceId}/...
                const parts = obj.Key?.split('/');
                if (parts && parts.length >= 2) {
                    const wsId = parts[1];
                    workspaceUsage[wsId] = (workspaceUsage[wsId] || 0) + size;
                }
            });

            isTruncated = response.IsTruncated || false;
            continuationToken = response.NextContinuationToken;
        }
    } catch (error) {
        console.error("Failed to list R2 objects:", error);
    }

    // 3. Combine Data
    const metrics = allWorkspaces.map(ws => ({
        id: ws.id,
        name: ws.name,
        usage: workspaceUsage[ws.id] || 0,
        formattedUsage: formatBytes(workspaceUsage[ws.id] || 0)
    })).sort((a, b) => b.usage - a.usage);

    return (
        <div className="p-8 max-w-5xl mx-auto font-sans">
            <h1 className="text-3xl font-bold mb-6">Storage Metrics</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-2">Total Storage Used</h3>
                    <p className="text-3xl font-bold text-blue-600">{formatBytes(totalSize)}</p>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-2">Total Workspaces</h3>
                    <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{allWorkspaces.length}</p>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-2">Status</h3>
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                        <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Live</p>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                        <tr>
                            <th className="px-6 py-4 font-medium text-zinc-500">Workspace Name</th>
                            <th className="px-6 py-4 font-medium text-zinc-500">ID</th>
                            <th className="px-6 py-4 font-medium text-zinc-500 text-right">Usage</th>
                            <th className="px-6 py-4 font-medium text-zinc-500 text-right">% of Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {metrics.map(ws => (
                            <tr key={ws.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                <td className="px-6 py-4 font-semibold text-zinc-900 dark:text-zinc-100">
                                    {ws.name}
                                </td>
                                <td className="px-6 py-4 font-mono text-xs text-zinc-400">
                                    {ws.id}
                                </td>
                                <td className="px-6 py-4 text-right font-medium text-zinc-700 dark:text-zinc-300">
                                    {ws.formattedUsage}
                                </td>
                                <td className="px-6 py-4 text-right text-zinc-500">
                                    {totalSize > 0 ? ((ws.usage / totalSize) * 100).toFixed(1) : 0}%
                                </td>
                            </tr>
                        ))}
                        {metrics.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                                    No workspaces found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
