import { useEffect, useRef } from "react";

/**
 * Custom hook for setInterval that properly handles cleanup.
 * @param callback - Function to call on each interval tick
 * @param delay - Interval delay in milliseconds (null to pause)
 * @param immediate - Whether to call the callback immediately on mount
 */
export function useInterval(
    callback: () => void,
    delay: number | null,
    immediate: boolean = false
) {
    const savedCallback = useRef(callback);

    // Update the ref inside an effect to comply with React strict mode
    useEffect(() => {
        savedCallback.current = callback;
    });

    useEffect(() => {
        if (delay === null) return;

        // Run immediately if requested
        if (immediate) {
            savedCallback.current();
        }

        const id = setInterval(() => savedCallback.current(), delay);
        return () => clearInterval(id);
    }, [delay, immediate]);
}
