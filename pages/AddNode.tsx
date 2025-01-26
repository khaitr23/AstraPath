import React, {ButtonHTMLAttributes, ChangeEvent, Component, JSX, MouseEvent} from "react"
import styles from "../styles/AddPage.module.css"

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
                    <input type="radio" id="factory" name="type" value="Factory"
                        onChange={this.setFactory}/>
                    <label>Factory</label>
                </p>
                <p>
                    <input type="radio" id="warehouse" name="type" value="Warehouse"
                        onChange={this.setWarehouse}/>
                    <label>Warehouse</label>
                </p>
                <p>
                    <input type="radio" id="endpoint" name="type" value="Endpoint"
                        onChange={this.setEndpoint}/>
                    <label>Endpoint (store, client address, etc.)</label>
                </p>
            </div>
            <div className={styles.input}>
                <div className={styles.inputtitle}>Name:</div> 
                <input type="text" value={this.state.name} className={styles.textinput}
                    onChange={this.updateName}></input>
            </div>
            <div className={styles.input}>
                <p className={styles.inputtitle}>Address (street, city, state, zip):</p>
                <input type="text" value={this.state.address} className={styles.textinput}
                    onChange={this.updateAddress}></input>
            </div>
            <button className={styles.button} onClick={this.addNode}>ADD</button>
        </div>
    }

    setFactory = (evt: ChangeEvent<HTMLInputElement>) => {
        this.setState({kind: "factory"})
    }

    setWarehouse = (evt: ChangeEvent<HTMLInputElement>) => {
        this.setState({kind: "warehouse"})
    }

    setEndpoint = (evt: ChangeEvent<HTMLInputElement>) => {
        this.setState({kind: "endpoint"})
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
        else if(this.state.name === ""){
            alert("You must name the location")
        }
        else if(this.state.address === ""){
            alert("You must specify an address")
        }
        else{

        }
    }


}