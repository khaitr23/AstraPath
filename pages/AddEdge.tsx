import React, {Component, JSX} from "react";
import styles from "../styles/AddPage.module.css"

type AddEdgeState = {
    start: Node | undefined
    end: Node | undefined
    transport: "trucks" | "plane" | "train" | "EV" | undefined
}

export class AddEdgePage extends Component<{}, AddEdgeState> {
    constructor(props: {}){
        super(props)

        this.state = {start: undefined, end: undefined, transport: undefined}
    }

    render = (): JSX.Element => {
        return <div className={styles.grid}>
            <div className={styles.input}>
                <p className={styles.inputtitle}>
                    Mode of transport:
                </p>
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
        </div>
    }
}