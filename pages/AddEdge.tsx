import React, {ChangeEvent, Component, JSX, MouseEvent} from "react";
import styles from "../styles/AddPage.module.css"

type AddEdgeState = {
    start: Node | undefined
    end: Node | undefined
    transport: "trucks" | "plane" | "train" | "EV" | undefined,
    factories: Node[],
    warehouses: Node[],
    endpoints: Node[]
}

export class AddEdgePage extends Component<{}, AddEdgeState> {
    constructor(props: {}){
        super(props)

        this.state = {
            start: undefined, 
            end: undefined, 
            transport: undefined,
            factories: [],
            warehouses: [],
            endpoints: []
        }
    }

    render = (): JSX.Element => {
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
                <p className={styles.inputtitle}>
                    Origin of route:
                </p>
            </div>

            <div className={styles.input}>
                <p className={styles.inputtitle}>
                    End of route:
                </p>
            </div>

            <button className={styles.button} onClick={this.addEdge}>ADD</button>
        </div>
    }

    addEdge = (evt: MouseEvent<HTMLButtonElement>): void => {
        
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