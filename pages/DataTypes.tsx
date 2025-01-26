export type Node = {
    kind: "factory" | "warehouse" | "endpoint",
    name: string,
    address: string
}

export type Edge = {
    start: Node,
    end: Node,
    distance: number,
    emissions: number,
    time: number,
    cost: number,
    transport: "trucks" | "plane" | "train" | "EV"
}