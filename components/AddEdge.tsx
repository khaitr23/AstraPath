import React, {ChangeEvent, Component, JSX, MouseEvent} from "react";
import styles from "../styles/AddPage.module.css"
import { Edge } from "./DataTypes";
import { Node } from "./DataTypes";
import { log } from "console";

type AddEdgeState = {
    start: string | undefined
    end: string | undefined
    transport: "trucks" | "plane" | "train" | "EV" | undefined,
    distance: number,
    cost: number,
    factories: Node[],
    warehouses: Node[],
    endpoints: Node[]
}

const co2emissons = {trucks: 1.3, plane: 53, train: 0.17, ev: 0}
const speed = {trucks: 55, plane: 550, train: 75, ev: 55}

export class AddEdgePage extends Component<{}, AddEdgeState> {
    constructor(props: {}){
        super(props)

        this.state = {
            start: undefined, 
            end: undefined, 
            transport: undefined,
            distance: 0,
            cost: 0,
            factories: [],
            warehouses: [],
            endpoints: []
        }
    }

    render = (): JSX.Element => {
        if(this.state.factories.length === 0 && this.state.warehouses.length === 0 && this.state.endpoints.length === 0){
            this.getNodes()
        }
        return <div className={styles.grid}>
            <h2>Add Direct Route (edge)</h2>
            <div className={styles.input}>
                <p className={styles.inputtitle}>
                    Mode of transport:
                </p>
                <select name="modes" className={styles.textinput} 
                    defaultValue={(this.state.transport===undefined) ? "undefined" : this.state.transport}
                    onChange={this.updateTransport}>
                    <option value="trucks">Truck</option>
                    <option value="plane">Plane</option>
                    <option value="train">Train</option>
                    <option value="EV">Electric Vehicle</option>
                    <option value="undefined"></option>
                </select>
            </div>

            <div className={styles.input}>
                <p className={styles.inputtitle}>Cost of route (dollars)</p>
                <input type="number" value={this.state.cost} className={styles.textinput}
                    onChange={this.updateCost}></input>
            </div>

            <div className={styles.input}>
                <p className={styles.inputtitle}>Distance between locations (miles)</p>
                <input type="number" value={this.state.distance} className={styles.textinput}
                    onChange={this.updateDistance}></input>
            </div>

            <div className={styles.input}>
                <p className={styles.inputtitle}>
                    Origin of route:
                </p>
                <select name="starts" className={styles.textinput} 
                    onChange={this.updateStart}>
                    {this.renderFactories()}
                    {this.renderWarehouses()}
                </select> 
            </div>

            <div className={styles.input}>
                <p className={styles.inputtitle}>
                    End of route:
                </p>
                <select name="ends" className={styles.textinput} 
                    onChange={this.updateEnd}>
                    {this.renderEndpoints()}
                    {this.renderWarehouses()}
                </select> 
            </div>

            <button className={styles.button} onClick={this.addEdge}>ADD</button>
        </div>
    }

    updateStart = (evt: ChangeEvent<HTMLSelectElement>): void => {
        this.setState({start: evt.target.value})
    }

    updateEnd = (evt: ChangeEvent<HTMLSelectElement>): void => {
        this.setState({end: evt.target.value})
    }

    renderFactories = (): JSX.Element[] => {
        let towrite: JSX.Element[] = []
        for(let i:number=0; i<this.state.factories.length; i++){
            const node: Node = this.state.factories[i]
            console.log("node:", node)
            towrite.push(<option value={node.name}>{node.name}</option>)
        }
        console.log(towrite)
        return towrite
    }

    renderWarehouses = (): JSX.Element[] => {
        let towrite: JSX.Element[] = []
        for(let i:number=0; i<this.state.warehouses.length; i++){
            const node: Node = this.state.warehouses[i]
            towrite.push(<option value={node.name}>{node.name}</option>)
        }
        return towrite
    }

    renderEndpoints = (): JSX.Element[] => {
        let towrite: JSX.Element[] = []
        for(let i:number=0; i<this.state.endpoints.length; i++){
            const node: Node = this.state.endpoints[i]
            towrite.push(<option value={node.name}>{node.name}</option>)
        }
        return towrite
    }

    getNodes = async (): Promise<void> => {
        const response = await fetch("/api/getAllNodes", {
            method: "GET",
        })
        if(response.ok){
            const data = await response.json()
            let fact: Node[] = []
            let ware: Node[] = []
            let end: Node[] = []
            data.forEach((item) => {
                if(item.labels[0] === "factory"){
                    fact.push({kind: "factory", name: item.id, address: item.address})
                }
                if(item.labels[0] === "warehouse"){
                    ware.push({kind: "warehouse", name: item.id, address: item.address})
                }
                if(item.labels[0] === "endpoint"){
                    end.push({kind: "endpoint", name: item.id, address: item.address})
                }
            }) 
            this.setState({factories: fact, warehouses: ware, endpoints: end})           
        }
        else{
            const error = await response.json();
            console.error('Error:', error);
        }
    }

    addEdge = async (evt: MouseEvent<HTMLButtonElement>): Promise<void> => {
        evt.preventDefault();

        if(this.state.start === undefined){
            alert("Must chose a start")
        }
        else if(this.state.end === undefined){
            alert("You must choose an end")
        }
        else{
            let co2: number = 0
            let time: number = 0
            if(this.state.transport === "plane"){
                co2 = this.state.distance * co2emissons.plane
                time = this.state.distance / speed.plane
            }
            else if(this.state.transport === "train"){
                co2 = this.state.distance * co2emissons.train
                time = this.state.distance / speed.train
            }
            else if(this.state.transport === "trucks"){
                co2 = this.state.distance * co2emissons.trucks
                time = this.state.distance / speed.trucks
            }
            else{
                time = this.state.distance / speed.ev
            }
            const newedge: Edge = {
                start: {kind: "endpoint", address: "", name: this.state.start},
                end:{kind: "endpoint", address: "", name: this.state.end},
                distance: this.state.distance,
                emissions: co2,
                time: time,
                transport: this.state.transport,
                cost: this.state.cost
            }
            try {
                // Send data to the AddNode API endpoint
                const response = await fetch("/api/addEdge", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    fromId: newedge.start.name,
                    toId: newedge.end.name,
                    co2Emission: newedge.emissions,
                    timeTaken: newedge.time,
                    distance: newedge.distance,
                    moneyCost: newedge.cost,
                    transportType: newedge.transport,
                  }),
                });
          
                if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(errorData.error || "Failed to add the node");
                }
          
                const result = await response.json();
                alert("Location added successfully!");
                console.log("Added Node:", result);
          
                // Reset form fields after success
                this.setState({
                    start: undefined, 
                    end: undefined, 
                    transport: undefined,
                    distance: 0,
                    cost: 0,
                    factories: [],
                    warehouses: [],
                    endpoints: []
                });
              } catch (err: any) {
                alert(`Error: ${err.message}`);
                console.error("Failed to add node:", err);
              }
        }
        
    }

    updateDistance = (evt: ChangeEvent<HTMLInputElement>): void => {
        const dist: number = Number(evt.target.value)
        if(dist < 0) return;
        this.setState({distance: dist})
    }

    updateCost = (evt: ChangeEvent<HTMLInputElement>): void => {
        const cost: number = Number(evt.target.value)
        this.setState({cost: cost})
    }

    updateTransport = (evt: ChangeEvent<HTMLSelectElement>): void => {
        if(evt.target.value === "undefined"){
            alert("You have to choose a mode of transport")
            return;
        }
        const trans: string = evt.target.value
        if(trans !== "trucks" && trans !== "plane" && trans !== "train" && trans !== "EV"){
            return;
        }
        this.setState({transport: trans})
    }
}