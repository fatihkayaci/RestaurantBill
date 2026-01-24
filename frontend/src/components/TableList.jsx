import { useState, useEffect } from 'react';
import { getTables } from '../services/api'
import './Style/TableList.css'
function TableList() {
    const [tables, setTables] = useState([]);

    useEffect(() => {
        getTables()
            .then(res => {
                setTables(res.data); 
            })
            .catch(err => console.error("Veri çekilemedi:", err));
    }, []);

    return(
        <div className='table-container'>
            {tables.map((table, index) => (
                <button
                    key={index}
                    className={`table-button ${table.status === 1 ? 'table-full' : 'table-empty'}`}
                >
                    <div>
                        Masa Adı: {table.name}
                    </div>
                </button>
            ))}
        </div>
    )
}

export default TableList;