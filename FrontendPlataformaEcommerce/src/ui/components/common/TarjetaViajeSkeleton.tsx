interface TarjetaViajeSkeletonProps {
  cantidad?: number;
}

export function TarjetaViajeSkeletonItem() {
  return (
    <div
      aria-hidden="true"
      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 overflow-hidden flex flex-col shadow-sm"
    >
      {/* Top Media Banner Skeleton */}
      <div className="relative h-32 sm:h-36 w-full overflow-hidden bg-slate-200 dark:bg-slate-700 animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 dark:via-white/10 to-transparent" />
        {/* Badge top-left */}
        <div className="absolute top-2.5 left-2.5 h-5 w-24 rounded-full bg-slate-300/90 dark:bg-slate-600" />
        {/* Badge top-right */}
        <div className="absolute top-2.5 right-2.5 h-5 w-24 rounded-full bg-slate-300/90 dark:bg-slate-600" />
        {/* Vehicle info bottom-left */}
        <div className="absolute bottom-2.5 left-3 flex items-center gap-2">
          <div className="h-3.5 w-16 rounded bg-slate-300/90 dark:bg-slate-600" />
          <div className="h-4 w-14 rounded bg-slate-300/90 dark:bg-slate-600" />
        </div>
      </div>

      {/* Card Body Skeleton */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3 animate-pulse">
        {/* Route Origin -> Destination */}
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-5 w-24 rounded-md bg-slate-200 dark:bg-slate-700" />
            <div className="h-4 w-5 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-5 w-28 rounded-md bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="h-3 w-32 rounded bg-slate-100 dark:bg-slate-700/60 mt-2" />
        </div>

        {/* Schedule Box */}
        <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-2.5 border border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100/70 dark:bg-slate-600 shrink-0" />
            <div className="space-y-1.5">
              <div className="h-2.5 w-14 rounded bg-slate-200 dark:bg-slate-600" />
              <div className="h-3.5 w-16 rounded bg-slate-300 dark:bg-slate-500" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-100/70 dark:bg-slate-600 shrink-0" />
            <div className="space-y-1.5">
              <div className="h-2.5 w-10 rounded bg-slate-200 dark:bg-slate-600" />
              <div className="h-3.5 w-16 rounded bg-slate-300 dark:bg-slate-500" />
            </div>
          </div>
        </div>

        {/* Amenities Pills */}
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-12 rounded-md bg-slate-100 dark:bg-slate-700/70" />
          <div className="h-5 w-12 rounded-md bg-slate-100 dark:bg-slate-700/70" />
          <div className="h-5 w-16 rounded-md bg-slate-100 dark:bg-slate-700/70" />
        </div>

        {/* Price & Action CTA */}
        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between gap-2">
          <div className="space-y-1.5">
            <div className="h-2.5 w-10 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-6 w-24 rounded-md bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="h-9 w-36 rounded-full bg-blue-100 dark:bg-slate-700" />
        </div>
      </div>
    </div>
  );
}

export function GridTarjetasViajeSkeleton({ cantidad = 3 }: TarjetaViajeSkeletonProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
      {Array.from({ length: cantidad }, (_, i) => (
        <TarjetaViajeSkeletonItem key={i} />
      ))}
    </div>
  );
}
