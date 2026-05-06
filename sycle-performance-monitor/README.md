# Sycle Performance Monitor

Advanced performance monitoring tool for React/Next.js applications with comprehensive observability features.

## Features

- 📊 **Overview Dashboard** - Real-time metrics, SLO compliance tracking, and AI-powered optimization recommendations
- 🌊 **Request Waterfall** - Visual timeline showing API request durations with color-coded performance indicators
- 💓 **Web Vitals** - Track Core Web Vitals (FCP, LCP, FID, CLS, TTFB) with Google's official metrics
- 🔍 **Backend Tracing** - Visualize request flow through Frontend → API → Service → Database layers
- ❌ **Error Tracking** - Automatic error detection and grouping with detailed troubleshooting information
- ⏱️ **Session Timeline** - Chronological view of all user interactions and API calls

## Installation

### Option 1: Copy Files (Recommended for now)

1. Copy the entire `src` folder to your project
2. Import the component and services:

```tsx
import PerformanceOverlay from './path/to/src/components/performance-overlay';
import { performanceMonitor } from './path/to/src/services/performance-monitor';
```

### Option 2: Direct Integration

Copy these files to your project:
- `src/components/performance-overlay.tsx` → Your components folder
- `src/services/performance-monitor.ts` → Your services folder
- `src/services/slo-monitor.ts` → Your services folder

## Usage

### Basic Setup

```tsx
import PerformanceOverlay from '@/components/performance-overlay';
import { performanceMonitor } from '@/services/performance-monitor';

function App() {
  useEffect(() => {
    // Enable the performance monitor
    performanceMonitor.enable();
  }, []);

  return (
    <>
      <YourApp />
      <PerformanceOverlay />
    </>
  );
}
```

### Next.js Setup (Recommended)

Use dynamic import to prevent SSR issues:

```tsx
import dynamic from 'next/dynamic';

const PerformanceOverlay = dynamic(
  () => import('@/components/performance-overlay'),
  { ssr: false }
);

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <PerformanceOverlay />
      </body>
    </html>
  );
}
```

### Track API Calls

The performance monitor automatically intercepts `fetch` calls. For manual tracking:

```tsx
import { performanceMonitor } from '@/services/performance-monitor';

// Track a custom API call
performanceMonitor.logApiCall({
  url: '/api/users',
  method: 'GET',
  duration: 150,
  status: 200,
  callOrigin: 'Frontend'
});
```

## Configuration

### SLO Thresholds

Customize SLO (Service Level Objective) thresholds in `src/services/slo-monitor.ts`:

```typescript
const sloConfigs: SLOConfig[] = [
  {
    name: 'API Response Time (P95)',
    target: 500,
    unit: 'milliseconds',
    critical: true
  },
  // Add your custom SLOs
];
```

### Styling

The component uses inline styles for portability. To customize:

1. Find the `styles` object at the bottom of `performance-overlay.tsx`
2. Modify colors, sizes, positioning as needed

Example:
```typescript
const styles = {
  container: {
    position: 'fixed',
    top: '20px',
    right: '20px',  // Change to 'left: 20px' for left positioning
    width: '50vw',
    // ... other styles
  }
}
```

## Features Guide

### 📊 Overview Tab
- **Real-time metrics**: Total calls, failures, average response time
- **Call origin breakdown**: See Frontend vs BFF vs SSR calls
- **SLO compliance**: Track 7 key performance indicators
- **AI recommendations**: Click "Ask AI How to Optimize" for suggestions

### 🌊 Waterfall Tab
- Visual bars show request duration
- Color coding: Green (<100ms), Yellow (100-500ms), Red (>500ms)
- Click any request to see details

### 💓 Web Vitals Tab
- **FCP**: First Contentful Paint - Time until first content appears
- **LCP**: Largest Contentful Paint - Main content load time
- **FID**: First Input Delay - Interactivity responsiveness
- **CLS**: Cumulative Layout Shift - Visual stability
- **TTFB**: Time to First Byte - Server response time

### 🔍 Tracing Tab
- See the full request journey through your stack
- Identify which layer is causing slowness
- Estimated timing breakdown for each layer

### ❌ Errors Tab
- Automatic error grouping by type
- Occurrence count for each error
- Detailed troubleshooting information for common HTTP errors (404, 500, etc.)

### ⏱️ Timeline Tab
- Complete chronological session history
- Every API call with timestamp, method, URL, duration, and status
- Perfect for debugging and understanding user workflows

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ⚠️ Limited (overlay may be too large)

## Performance Impact

- Minimal overhead (~1-2ms per API call)
- Uses `requestIdleCallback` for non-blocking updates
- Automatically disabled in production (unless manually enabled)

## Tips

1. **Use in development/staging** - Great for debugging and optimization
2. **Share with team** - Non-technical users can understand the metrics
3. **Demo tool** - Perfect for showing performance improvements to stakeholders
4. **Error debugging** - The error details help diagnose issues quickly

## Troubleshooting

### Monitor not appearing
- Check that `performanceMonitor.enable()` is called
- Verify the component is rendered (check React DevTools)
- Try using Next.js dynamic import with `ssr: false`

### API calls not tracked
- The monitor auto-tracks `fetch` calls
- For `axios` or other libraries, use manual logging
- Check browser console for any errors

### Hydration errors (Next.js)
- Use dynamic import with `ssr: false`
- Don't render the overlay during SSR

## License

MIT

## Support

For issues or questions, contact the Sycle development team.

---

Built with ❤️ by Sycle for better web performance
