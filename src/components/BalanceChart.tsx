import { useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipProps } from "recharts";
import { Table2, LineChart as LineIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Player, TimelinePoint } from "@/lib/teenpatti";
import { formatMoney, formatSignedMoney } from "@/lib/utils";

/** Validated categorical palette has 8 slots; beyond that we show the table only (never generate hues). */
export const MAX_CHART_SERIES = 8;
/** Direct end-of-line labels only when they can't collide. */
const MAX_DIRECT_LABELS = 4;

// Colour follows the entity (seat), never its rank.
const seriesColor = (player: Player) => `var(--series-${(player.id % MAX_CHART_SERIES) + 1})`;

interface Props {
  players: Player[];
  timeline: TimelinePoint[];
}

const ChartTooltip = ({ active, payload, label, players }: TooltipProps<number, string> & { players: Player[] }) => {
  if (!active || !payload?.length) return null;
  const rows = [...payload].sort((a, b) => Number(b.value) - Number(a.value));
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-soft">
      <div className="mb-1 font-semibold">{label === 0 ? "Start" : `After round ${label}`}</div>
      <ul className="space-y-0.5">
        {rows.map((row) => {
          const player = players.find((p) => p.name === row.dataKey);
          return (
            <li key={String(row.dataKey)} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: player && seriesColor(player) }} />
                {row.dataKey}
              </span>
              <span className="font-medium tabular-nums">{formatSignedMoney(Number(row.value))}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export const BalanceChart = ({ players, timeline }: Props) => {
  const tooMany = players.length > MAX_CHART_SERIES;
  const [showTable, setShowTable] = useState(tooMany);
  const rounds = timeline.length - 1;
  const lastIndex = timeline.length - 1;

  if (rounds < 1) return null;

  return (
    <section aria-labelledby="balance-chart-title" className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 id="balance-chart-title" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Balance by round
        </h3>
        {!tooMany && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setShowTable((v) => !v)}
            aria-pressed={showTable}
          >
            {showTable ? <LineIcon className="mr-1 h-3.5 w-3.5" /> : <Table2 className="mr-1 h-3.5 w-3.5" />}
            {showTable ? "Chart" : "Table"}
          </Button>
        )}
      </div>

      {tooMany && (
        <p className="text-xs text-muted-foreground">
          The chart shows up to {MAX_CHART_SERIES} players; here is the round-by-round table instead.
        </p>
      )}

      {!showTable ? (
        <>
          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs" aria-label="Legend">
            {players.map((p) => (
              <li key={p.id} className="flex items-center gap-1.5 text-foreground">
                <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ background: seriesColor(p), height: 3 }} />
                {p.name}
              </li>
            ))}
          </ul>
          <div className="h-56 w-full" role="img" aria-label={`Line chart of each player's balance over ${rounds} rounds`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={timeline}
                margin={{ top: 8, right: players.length <= MAX_DIRECT_LABELS ? 56 : 12, bottom: 4, left: 4 }}
              >
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                <XAxis
                  dataKey="round"
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  tickFormatter={(r: number) => (r === 0 ? "Start" : `R${r}`)}
                />
                <YAxis
                  width={56}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  tickFormatter={(v: number) => formatMoney(v)}
                />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.5} />
                <Tooltip
                  cursor={{ stroke: "hsl(var(--muted-foreground))", strokeDasharray: "3 3" }}
                  content={<ChartTooltip players={players} />}
                />
                {players.map((p) => (
                  <Line
                    key={p.id}
                    type="linear"
                    dataKey={p.name}
                    stroke={seriesColor(p)}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, stroke: "hsl(var(--card))", strokeWidth: 2 }}
                    isAnimationActive={false}
                    label={
                      players.length <= MAX_DIRECT_LABELS
                        ? ({ x, y, index }: { x: number; y: number; index: number }) =>
                            index === lastIndex ? (
                              <text x={x + 6} y={y} dy={4} fontSize={11} fill="hsl(var(--foreground))">
                                {p.name}
                              </text>
                            ) : (
                              <g />
                            )
                        : false
                    }
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <caption className="sr-only">Cumulative balance per player after each round</caption>
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th scope="col" className="px-2 py-1.5 text-left font-medium">Round</th>
                {players.map((p) => (
                  <th key={p.id} scope="col" className="px-2 py-1.5 text-right font-medium">
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {timeline.slice(1).map((point) => (
                <tr key={point.round} className="border-t border-border/60">
                  <th scope="row" className="px-2 py-1 text-left font-medium">R{point.round}</th>
                  {players.map((p) => (
                    <td key={p.id} className="px-2 py-1 text-right">
                      {formatSignedMoney(point[p.name] ?? 0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
