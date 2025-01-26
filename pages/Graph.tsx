import React, { Component, JSX } from "react";
import { ForceGraph2D } from "react-force-graph";

type GraphState = {
    nodes,
    links
}

export class GraphPage extends Component<{}, GraphState> {
    constructor(props: {}){
        super(props)
        this.state = {nodes: undefined, links: undefined}
    }

    render = (): JSX.Element => {
        const n = this.state.nodes
        const l = this.state.links
        if(this.state.nodes === undefined){
            this.fetchGraph()
        }
        console.log(n, l)
        return <div></div>
        return <ForceGraph2D
            graphData={{ n, l }}
            nodeLabel="id"
            linkDirectionalArrowLength={5}
      />
    }

    fetchGraph = async (): Promise<void> => {
        const response = await fetch("/api/getGraph", {
            method: "GET",
        })
        if(response.ok){
            const data = await response.json()
            console.log("the graph:", data)
            
            this.setState({nodes: data.nodes, links: data.links})
        }
    }


}