import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getProducts, getCategories, getActiveOrder, addOrderItem, deleteOrderItem } from '../services/api'
import './Style/OrderDetail.css';

function OrderDetail() {
    const { id } = useParams();

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [activeOrder, setActiveOrder] = useState(null);
    
    useEffect(() => {
        getProducts()
            .then(res => {
                setProducts(res.data); 
            })
            .catch(err => console.error("Veri çekilemedi:", err));
    }, []);

    useEffect(() => {
        getCategories()
            .then(res => {
                setCategories(res.data); 
            })
            .catch(err => console.error("Veri çekilemedi:", err));
    }, []);

    useEffect(() => {
        getActiveOrder(id)
            .then(res => {
                console.log(res.data);
                setActiveOrder(res.data); 
            })
            .catch(err => console.error("Veri çekilemedi:", err));
    }, [id]);

    const handleAddProduct = (productId) => {
        if (!activeOrder) {
            alert("Lütfen önce bir masa/sipariş seçin!");
            return;
        }
        console.log(activeOrder);
        const payload = {
            orderId: activeOrder.id,
            productId: productId,
            quantity: 1
        };

        addOrderItem(payload)
        .then(res => {
            console.log("Ürün eklendi!");
            getActiveOrder(id).then(res => setActiveOrder(res.data));
        })
        .catch(err => {
            console.error("Ekleme hatası:", err);
            alert("Ürün eklenemedi!");
        });
    };

    const handleRemoveItem = (itemId) => {
        if (window.confirm("Bu ürünü iptal etmek istediğine emin misin?")) {
            console.log("Silinecek OrderItem ID:", itemId);
            deleteOrderItem(itemId)
            .then(res => {
                console.log("Ürün Silindi!");
                getActiveOrder(id).then(res => setActiveOrder(res.data));
            })
            .catch(err => {
                console.error("Silme hatası:", err);
                alert("Ürün Silinemedi!");
            });
        }
    };

    return (
        <div className="order-page">
        
            <div className="menu-section">
                <div className="category-tabs">
                {categories.map((cat, index) => (
                    <button key={index} className={`cat-btn ${index === 0 ? 'active' : ''}`}>
                    {cat.name}
                    </button>
                ))}
                </div>
                
                <div className="product-grid">
                {products.map((product) => (
                    <div 
                        key={product.id} 
                        className="product-card" 
                        onClick={() => handleAddProduct(product.id)} >
                    <div className="product-img">
                        <img 
                            src={product.image || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=200&auto=format&fit=crop'} 
                            alt={product.name} 
                            onError={(e) => { e.target.src = 'https://via.placeholder.com/150'; }} />
                        </div>
                    <div className="product-info">
                        <h3>{product.name}</h3>
                        <span>{product.price} ₺</span>
                    </div>
                    </div>
                ))}
                </div>
            </div>

            <div className="cart-section">
                {activeOrder ? (
                    <>
                        <div className="cart-header">
                            <h2>Masa {id}</h2>
                            <span className="order-id">Adisyon #{activeOrder.id}</span>
                        </div>
                        <div className="cart-items">
                            {activeOrder.orderItems.map((item) => (
                                <div key={item.id} className="cart-item">
                                    <div className="item-detail">
                                        <span>{item.productName || item.product?.name}</span>
                                        
                                        <small>
                                            ₺{item.price} x {item.quantity}
                                        </small>
                                    </div>
                                    <span className="item-price">
                                        {item.price * item.quantity} ₺
                                    </span>
                                    <button 
                                        className="delete-btn" 
                                        onClick={() => handleRemoveItem(item.id)}
                                    >
                                        <svg 
                                            xmlns="http://www.w3.org/2000/svg" 
                                            width="18" 
                                            height="18" 
                                            viewBox="0 0 24 24" 
                                            fill="none" 
                                            stroke="currentColor" 
                                            strokeWidth="2" 
                                            strokeLinecap="round" 
                                            strokeLinejoin="round"
                                        >
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                            <line x1="10" y1="11" x2="10" y2="17"></line>
                                            <line x1="14" y1="11" x2="14" y2="17"></line>
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="cart-footer">
                            <div className="total-row">
                                <span>Toplam Tutar</span>
                                <span className="total-price">{activeOrder.totalPrice} ₺</span>
                            </div>
                            <button className="pay-btn">Ödeme Al</button>
                        </div>
                    </>
                ) : (
                    <div className="empty-cart-message">
                        <h3>Masa Boş</h3>
                        <p>Henüz bir sipariş açılmamış.</p>
                        <button className="create-order-btn">
                            + Sipariş Oluştur
                        </button>
                    </div>
                )}
            </div>

        </div>
    );
}

export default OrderDetail;