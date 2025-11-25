// search.js - Motor de búsqueda moderno para biblioteca PDF
class PDFSearchEngine {
    constructor() {
        this.documents = [];
        this.filteredDocuments = [];
        this.currentPage = 1;
        this.documentsPerPage = 10;
        this.currentFilters = {};
        
        this.initializeApp();
    }

    async initializeApp() {
        await this.loadDocuments();
        this.setupEventListeners();
        this.renderDocuments();
        this.updateStats();
    }

    async loadDocuments() {
        try {
            const response = await fetch('./data/documents.json');
            const data = await response.json();
            this.documents = data.documents;
            this.filteredDocuments = [...this.documents];
            console.log(`✅ Cargados ${this.documents.length} documentos`);
        } catch (error) {
            console.error('❌ Error cargando documentos:', error);
            this.showError('No se pudieron cargar los documentos. Verifica que documents.json exista.');
        }
    }

    setupEventListeners() {
        // Búsqueda en tiempo real
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentFilters.search = e.target.value;
                this.performSearch();
            });
        }

        // Filtros
        const categoryFilter = document.getElementById('categoryFilter');
        const authorFilter = document.getElementById('authorFilter');
        const dateFilter = document.getElementById('dateFilter');

        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.currentFilters.category = e.target.value;
                this.performSearch();
            });
        }

        if (authorFilter) {
            authorFilter.addEventListener('input', (e) => {
                this.currentFilters.author = e.target.value;
                this.performSearch();
            });
        }

        if (dateFilter) {
            dateFilter.addEventListener('change', (e) => {
                this.currentFilters.date = e.target.value;
                this.performSearch();
            });
        }

        // Ordenamiento
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.currentFilters.sort = e.target.value;
                this.performSearch();
            });
        }

        // Botón limpiar filtros
        const clearFiltersBtn = document.getElementById('clearFilters');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.clearFilters();
            });
        }
    }

    performSearch() {
        let results = [...this.documents];

        // Filtro de búsqueda general
        if (this.currentFilters.search) {
            const searchTerm = this.currentFilters.search.toLowerCase();
            results = results.filter(doc => 
                doc.titulo.toLowerCase().includes(searchTerm) ||
                doc.autor.toLowerCase().includes(searchTerm) ||
                doc.categoria.toLowerCase().includes(searchTerm) ||
                doc.descripcion.toLowerCase().includes(searchTerm) ||
                (doc.fuente && doc.fuente.toLowerCase().includes(searchTerm)) || // NUEVO: Búsqueda en fuente
                (doc.isbn && doc.isbn.toLowerCase().includes(searchTerm)) ||     // NUEVO: Búsqueda en ISBN
                (doc.palabras_clave && doc.palabras_clave.some(keyword => 
                    keyword.toLowerCase().includes(searchTerm)
                ))
            );
        }

        // Filtro por categoría
        if (this.currentFilters.category) {
            results = results.filter(doc => 
                doc.categoria === this.currentFilters.category
            );
        }

        // Filtro por autor
        if (this.currentFilters.author) {
            const authorTerm = this.currentFilters.author.toLowerCase();
            results = results.filter(doc => 
                doc.autor.toLowerCase().includes(authorTerm)
            );
        }

        // Filtro por fecha
        if (this.currentFilters.date) {
            results = results.filter(doc => 
                doc.fecha === this.currentFilters.date
            );
        }

        // Ordenamiento
        if (this.currentFilters.sort) {
            results.sort((a, b) => {
                switch (this.currentFilters.sort) {
                    case 'titulo_asc':
                        return a.titulo.localeCompare(b.titulo);
                    case 'titulo_desc':
                        return b.titulo.localeCompare(a.titulo);
                    case 'fecha_reciente':
                        return new Date(b.fecha) - new Date(a.fecha);
                    case 'fecha_antiguo':
                        return new Date(a.fecha) - new Date(b.fecha);
                    case 'autor_asc':
                        return a.autor.localeCompare(b.autor);
                    default:
                        return 0;
                }
            });
        }

        this.filteredDocuments = results;
        this.currentPage = 1;
        this.renderDocuments();
        this.updateStats();
    }

    clearFilters() {
        // Limpiar inputs
        document.getElementById('searchInput').value = '';
        document.getElementById('categoryFilter').value = '';
        document.getElementById('authorFilter').value = '';
        document.getElementById('dateFilter').value = '';
        document.getElementById('sortSelect').value = 'titulo_asc';

        // Limpiar filtros
        this.currentFilters = {};
        this.filteredDocuments = [...this.documents];
        this.currentPage = 1;
        
        this.renderDocuments();
        this.updateStats();
        this.showToast('Filtros limpiados');
    }

    renderDocuments() {
        const resultsContainer = document.getElementById('results');
        if (!resultsContainer) return;

        // Calcular paginación
        const startIndex = (this.currentPage - 1) * this.documentsPerPage;
        const endIndex = startIndex + this.documentsPerPage;
        const paginatedDocuments = this.filteredDocuments.slice(startIndex, endIndex);

        if (paginatedDocuments.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <div class="no-results-icon">🔍</div>
                    <h3>No se encontraron documentos</h3>
                    <p>Intenta con otros términos de búsqueda o limpia los filtros</p>
                    <button class="btn btn-secondary" onclick="pdfSearch.clearFilters()">
                        Limpiar Filtros
                    </button>
                </div>
            `;
            return;
        }

        resultsContainer.innerHTML = paginatedDocuments.map(doc => `
            <div class="document-card" data-category="${doc.categoria}">
                <div class="document-header">
                    <h3 class="document-title">${this.highlightText(doc.titulo)}</h3>
                    <span class="document-size">${doc.tamaño_mb} MB</span>
                </div>
                
                <div class="document-meta">
                    <span class="meta-item">
                        <span class="meta-icon">👤</span>
                        ${this.highlightText(doc.autor)}
                    </span>
                    <span class="meta-item">
                        <span class="meta-icon">📅</span>
                        ${new Date(doc.fecha).toLocaleDateString('es-ES')}
                    </span>
                    <span class="meta-item">
                        <span class="meta-icon">📁</span>
                        ${doc.categoria}
                    </span>
                    ${doc.fuente ? `
                    <span class="meta-item">
                        <span class="meta-icon">🏢</span>
                        ${this.highlightText(doc.fuente)}
                    </span>
                    ` : ''}
                    ${doc.isbn ? `
                    <span class="meta-item">
                        <span class="meta-icon">📖</span>
                        ${this.highlightText(doc.isbn)}
                    </span>
                    ` : ''}
                </div>

                <p class="document-description">${this.highlightText(doc.descripcion)}</p>

                ${doc.palabras_clave && doc.palabras_clave.length > 0 ? `
                    <div class="keywords">
                        ${doc.palabras_clave.map(keyword => `
                            <span class="keyword-tag">${this.highlightText(keyword)}</span>
                        `).join('')}
                    </div>
                ` : ''}

                <div class="document-actions">
                    <a href="${doc.enlace_gdrive}" target="_blank" class="btn btn-primary">
                        <span class="btn-icon">📖</span>
                        Ver Documento
                    </a>
                    <button class="btn btn-secondary" onclick="pdfSearch.showDocumentDetails(${doc.id})">
                        <span class="btn-icon">ℹ️</span>
                        Detalles
                    </button>
                </div>
            </div>
        `).join('');

        this.renderPagination();
    }

    highlightText(text) {
        if (!this.currentFilters.search || !text) return text;
        
        const searchTerm = this.currentFilters.search.toLowerCase();
        const regex = new RegExp(`(${this.escapeRegex(searchTerm)})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    renderPagination() {
        const paginationContainer = document.getElementById('pagination');
        if (!paginationContainer) return;

        const totalPages = Math.ceil(this.filteredDocuments.length / this.documentsPerPage);
        
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        let paginationHTML = '';
        
        // Botón anterior
        if (this.currentPage > 1) {
            paginationHTML += `<button class="pagination-btn" onclick="pdfSearch.goToPage(${this.currentPage - 1})">← Anterior</button>`;
        }

        // Páginas
        for (let i = 1; i <= totalPages; i++) {
            if (i === this.currentPage) {
                paginationHTML += `<span class="pagination-current">${i}</span>`;
            } else if (
                i === 1 || 
                i === totalPages || 
                Math.abs(i - this.currentPage) <= 2
            ) {
                paginationHTML += `<button class="pagination-btn" onclick="pdfSearch.goToPage(${i})">${i}</button>`;
            } else if (Math.abs(i - this.currentPage) === 3) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
        }

        // Botón siguiente
        if (this.currentPage < totalPages) {
            paginationHTML += `<button class="pagination-btn" onclick="pdfSearch.goToPage(${this.currentPage + 1})">Siguiente →</button>`;
        }

        paginationContainer.innerHTML = paginationHTML;
    }

    goToPage(page) {
        this.currentPage = page;
        this.renderDocuments();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    updateStats() {
        const statsElement = document.getElementById('stats');
        if (!statsElement) return;

        statsElement.innerHTML = `
            Mostrando <strong>${this.filteredDocuments.length}</strong> de 
            <strong>${this.documents.length}</strong> documentos
            ${this.currentFilters.search ? `para "<strong>${this.currentFilters.search}</strong>"` : ''}
        `;
    }

    showDocumentDetails(docId) {
        const doc = this.documents.find(d => d.id === docId);
        if (!doc) return;

        // Crear modal de detalles
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${doc.titulo}</h2>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Autor:</label>
                            <span>${doc.autor}</span>
                        </div>
                        <div class="detail-item">
                            <label>Fecha:</label>
                            <span>${new Date(doc.fecha).toLocaleDateString('es-ES')}</span>
                        </div>
                        <div class="detail-item">
                            <label>Categoría:</label>
                            <span>${doc.categoria}</span>
                        </div>
                        <div class="detail-item">
                            <label>Tamaño:</label>
                            <span>${doc.tamaño_mb} MB</span>
                        </div>
                    </div>
                    <div class="detail-description">
                        <label>Descripción:</label>
                        <p>${doc.descripcion}</p>
                    </div>
                    ${doc.palabras_clave && doc.palabras_clave.length > 0 ? `
                        <div class="detail-keywords">
                            <label>Palabras clave:</label>
                            <div class="keywords">
                                ${doc.palabras_clave.map(keyword => `
                                    <span class="keyword-tag">${keyword}</span>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
                <div class="modal-actions">
                    <a href="${doc.enlace_gdrive}" target="_blank" class="btn btn-primary">
                        📖 Abrir en Google Drive
                    </a>
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        Cerrar
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <div class="error-content">
                <span class="error-icon">⚠️</span>
                <span>${message}</span>
            </div>
        `;
        
        const container = document.querySelector('.container');
        container.insertBefore(errorDiv, container.firstChild);

        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    showToast(message) {
        // Implementación simple de toast
        const toast = document.createElement('div');
        toast.className = 'toast-message';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.pdfSearch = new PDFSearchEngine();
});

// Exportar para uso global
window.PDFSearchEngine = PDFSearchEngine;