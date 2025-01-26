import React, {ButtonHTMLAttributes, ChangeEvent, Component, JSX, MouseEvent} from "react"
import styles from "../styles/AddNode.module.css"

type AddNodeState = {
    kind: "factory" | "warehouse" | "endpoint" | undefined,
    name: string,
    address: string
}

export class AddNodePage extends Component<{}, AddNodeState> {
    constructor(props: {}){
        super(props)

        this.state = {kind: undefined, name: "", address: ""}
    }

    render = (): JSX.Element => {
        return <div className={styles.grid}>
            <h2>Add a location: Factory / Warehouse / Endpoint</h2>
            <div className={styles.input}>
                <p className={styles.inputtitle}>
                    Type of location:
                </p>
                <p>
                    <input type="radio" id="factory" name="type" value="Factory"/>
                    <label>Factory</label>
                </p>
                <p>
                    <input type="radio" id="warehouse" name="type" value="Warehouse"/>
                    <label>Warehouse</label>
                </p>
                <p>
                    <input type="radio" id="endpoint" name="type" value="Endpoint"/>
                    <label>Endpoint (store, client address, etc.)</label>
                </p>
            </div>
            <p className={styles.input}>
                <p className={styles.inputtitle}>Name:</p> 
                <input type="text" value={this.state.name} className={styles.textinput}
                    onChange={this.updateName}></input>
            </p>
            <p className={styles.input}>
                <p className={styles.inputtitle}>Address (street, city, state, zip):</p>
                <input type="text" value={this.state.address} className={styles.textinput}
                    onChange={this.updateAddress}></input>
            </p>
            <button className={styles.button} onClick={this.addNode}>ADD</button>
        </div>
    }

    updateName = (evt: ChangeEvent<HTMLInputElement>): void => {
        const newname: string = evt.target.value
        this.setState({name: newname})
    }

    updateAddress = (evt: ChangeEvent<HTMLInputElement>): void => {
        const newaddress: string = evt.target.value
        this.setState({address: newaddress})
    }

    addNode = (evt: MouseEvent<HTMLButtonElement>): void => {
        if(this.state.kind === undefined){
            alert("You must choose a location type")
        }
        else{
            
        }
    }
}