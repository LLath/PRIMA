declare namespace Level {
    interface Platform {
        scaleY: number;
        scaleX: number;
        translateY: number;
        translateX: number;
    }
    export function generateLevel(): Array<Platform>;
    export function clear(): void;
    export {};
}
