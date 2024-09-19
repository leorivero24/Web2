
document.addEventListener('DOMContentLoaded', () => {
    const apiBase = 'https://collectionapi.metmuseum.org/public/collection/v1/';
    const departmentFilter = document.getElementById('department-filter');
    const keywordFilter = document.getElementById('keyword-filter');
    const locationFilter = document.getElementById('location-filter');
    const searchButton = document.getElementById('search-button');
    const gallery = document.getElementById('gallery');
    const pagination = document.getElementById('pagination');

    let currentPage = 1;
    const itemsPerPage = 20;
    let totalItems = 0;

    async function loadDepartments() {
        try {
            const response = await fetch(`${apiBase}departments`);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();
            data.departments.forEach(department => {
                const option = document.createElement('option');
                option.value = department.departmentId;
                option.textContent = department.displayName;
                departmentFilter.appendChild(option);
            });
        } catch (error) {
            console.error('Error al cargar departamentos:', error);
            gallery.innerHTML = '<p>Error al cargar departamentos. Por favor, intenta de nuevo más tarde.</p>';
        }
    }

    async function translateText(text, targetLang) {
        try {
            const response = await fetch('/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text, targetLang: targetLang })
            });
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();
            return data.translatedText;
        } catch (error) {
            console.error('Error al traducir texto:', error);
            return text; // Devuelve el texto original en caso de error
        }
    }

    async function displayImages(images) {
        gallery.innerHTML = '';
        if (images.length === 0) {
            gallery.innerHTML = '<p>No se encontraron resultados.</p>';
            return;
        }

        const targetLang = 'es'; // Idioma al que quieres traducir

        for (const image of images) {
            const card = document.createElement('div');
            card.className = 'card';

            const img = document.createElement('img');
            img.src = image.primaryImageSmall || 'https://www.italfren.com.ar/images/catalogo/imagen-no-disponible.jpeg';
            img.alt = image.title || 'No Title';
            img.title = image.objectDate || 'Fecha no disponible';

            const cardContent = document.createElement('div');
            cardContent.className = 'card-content';

            const title = document.createElement('h3');
            title.textContent = await translateText(image.title || 'No Title', targetLang);

            const culture = document.createElement('p');
            culture.textContent = await translateText(image.culture ? `Cultura: ${image.culture}` : 'Cultura: No disponible', targetLang);

            const dynasty = document.createElement('p');
            dynasty.textContent = await translateText(image.dynasty ? `Dinastía: ${image.dynasty}` : 'Dinastía: No disponible', targetLang);

            cardContent.appendChild(title);
            cardContent.appendChild(culture);
            cardContent.appendChild(dynasty);

            card.appendChild(img);
            card.appendChild(cardContent);

            if (image.additionalImages && image.additionalImages.length > 0) {
                const viewMoreButton = document.createElement('button');
                viewMoreButton.textContent = `Ver más imágenes adicionales (${image.additionalImages.length})`;
                viewMoreButton.className = 'view-more';

                viewMoreButton.addEventListener('click', () => {
                    image.additionalImages.forEach(additionalImage => {
                        window.open(additionalImage, '_blank');
                    });
                });

                card.appendChild(viewMoreButton);
            }

            gallery.appendChild(card);
        }
    }

    function updatePagination() {
        pagination.innerHTML = '';
        const totalPages = Math.ceil(totalItems / itemsPerPage);

        const createButton = (text, page, disabled) => {
            const button = document.createElement('button');
            button.textContent = text;
            button.disabled = disabled;
            button.className = disabled ? 'disabled' : '';
            button.addEventListener('click', () => {
                if (!disabled) {
                    currentPage = page;
                    searchArtObjects(); // Recarga los objetos según la nueva página
                }
            });
            return button;
        };

        pagination.appendChild(createButton('Anterior', currentPage - 1, currentPage === 1));
        pagination.appendChild(createButton('Siguiente', currentPage + 1, currentPage === totalPages));
    }

    async function searchArtObjects() {
        const department = departmentFilter.value;
        const keyword = keywordFilter.value;
        const location = locationFilter.value;

        let query = `${apiBase}search?`;
        if (department) {
            query += `departmentId=${department}&`;
        }
        if (keyword) {
            query += `q=${encodeURIComponent(keyword)}&`;
        } else {
            query += `q=*&`;
        }
        if (location) {
            query += `location=${encodeURIComponent(location)}&`;
        }

        query = query.slice(0, -1); // Eliminar el último "&" si existe

        try {
            searchButton.textContent = 'Buscando...';
            searchButton.classList.add('busy');
            searchButton.disabled = true;

            const response = await fetch(query);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();

            if (data.objectIDs && data.objectIDs.length > 0) {
                totalItems = data.objectIDs.length; // Actualizar el total de ítems
                const startIndex = (currentPage - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                const paginatedObjectIDs = data.objectIDs.slice(startIndex, endIndex);

                const paginatedObjects = await Promise.all(
                    paginatedObjectIDs.map(async (id) => {
                        const res = await fetch(`${apiBase}objects/${id}`);
                        return res.json();
                    })
                );

                displayImages(paginatedObjects);
                updatePagination();
                console.log(`Resultados de la consulta: ${totalItems} objetos de arte`);
            } else {
                gallery.innerHTML = '<p>No se encontraron resultados.</p>';
                pagination.innerHTML = '';
            }

        } catch (error) {
            console.error('Error al buscar objetos de arte:', error);
            gallery.innerHTML = '<p>Error al buscar objetos de arte. Por favor, intenta de nuevo más tarde.</p>';
            pagination.innerHTML = '';
        } finally {
            searchButton.textContent = 'Buscar';
            searchButton.classList.remove('busy');
            searchButton.disabled = false;
        }
    }

    // Inicialización
    loadDepartments();
    searchButton.addEventListener('click', () => {
        currentPage = 1; // Reiniciar la página actual a 1 al realizar una nueva búsqueda
        searchArtObjects();
    });
});
