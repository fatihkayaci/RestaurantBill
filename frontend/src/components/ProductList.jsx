import { useState, useEffect } from 'react';
import { getProducts } from '../services/api'

function ProductList() {
    const [products, setProducts] = useState([]);

    useEffect(() => {
        getProducts()
            .then(res => {
                console.log(res)
                setProducts(res.data); 
            })
            .catch(err => console.error("Veri çekilemedi:", err));
    }, []);

    return(
        <div className='product-container'>
            {products.map((product, index) => (
                <button
                    key={index}
                >
                    <div>
                        Masa Adı: {product.name}
                    </div>
                </button>
            ))}
        </div>
    )
}

export default ProductList;