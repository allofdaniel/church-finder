const fs = require('fs');
const path = require('path');

const cssContent = `* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.app {
  min-height: 100vh;
  background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
  padding: 16px;
  padding-bottom: 80px;
}

header {
  text-align: center;
  margin-bottom: 20px;
  padding-top: 10px;
}

header h1 {
  color: white;
  font-size: 1.6rem;
  margin: 0;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.header-icon {
  font-size: 1.8rem;
}

.subtitle {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
  margin-top: 5px;
}

/* Stats Bar */
.stats-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  overflow-x: auto;
  padding: 4px 0;
}

.stat-item {
  flex: 1;
  min-width: 100px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.stat-item:hover {
  background: rgba(255, 255, 255, 0.15);
}

.stat-item.active {
  background: rgba(255, 255, 255, 0.2);
  border-color: var(--accent-color);
}

.stat-icon {
  font-size: 1.5rem;
}

.stat-label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.75rem;
}

.stat-count {
  color: white;
  font-weight: 700;
  font-size: 0.9rem;
}

/* Search */
.search-container {
  position: relative;
  margin-bottom: 12px;
}

.search-input {
  width: 100%;
  padding: 14px 18px;
  padding-right: 40px;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  outline: none;
}

.search-input::placeholder {
  color: #999;
}

.clear-search {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: #ddd;
  border: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Filter Row */
.filter-row {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.region-select {
  flex: 1;
  padding: 12px 16px;
  border: none;
  border-radius: 10px;
  font-size: 0.95rem;
  background: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  outline: none;
}

.location-btn {
  padding: 12px 16px;
  border: none;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
  color: white;
  white-space: nowrap;
  transition: all 0.3s;
}

.location-btn:hover {
  transform: scale(1.02);
}

.location-btn.loading {
  opacity: 0.7;
  cursor: wait;
}

.location-btn:disabled {
  opacity: 0.7;
  cursor: wait;
}

/* View Toggle */
.view-toggle {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.view-toggle button {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  transition: all 0.3s;
}

.view-toggle button.active {
  background: white;
  color: #1e3a5f;
}

/* Results Info */
.results-info {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.85rem;
  margin-bottom: 12px;
  padding-left: 4px;
}

.results-info strong {
  color: white;
}

.nearby-info {
  color: #a5b4fc;
}

/* Map */
.map-wrapper {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
}

.map-container {
  height: 450px;
  width: 100%;
}

/* Custom Markers */
.custom-marker .marker-icon {
  width: 36px;
  height: 36px;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
}

.custom-marker .marker-icon::after {
  content: attr(data-icon);
  transform: rotate(45deg);
  font-size: 16px;
}

.cluster-marker .cluster-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 15px rgba(0, 0, 0, 0.3);
  border: 3px solid white;
}

.cluster-marker .cluster-icon span {
  color: white;
  font-weight: 700;
  font-size: 0.9rem;
}

/* User Location Marker */
.user-location-marker .user-marker {
  position: relative;
  width: 24px;
  height: 24px;
}

.user-marker-dot {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 14px;
  height: 14px;
  background: #4F46E5;
  border-radius: 50%;
  border: 3px solid white;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.5);
}

.user-marker-pulse {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  background: rgba(79, 70, 229, 0.3);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: translate(-50%, -50%) scale(0.5);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.5);
    opacity: 0;
  }
}

/* Popup */
.marker-popup strong {
  color: #1e3a5f;
  font-size: 0.95rem;
}

.marker-popup p {
  margin: 4px 0 0 0;
  color: #666;
  font-size: 0.8rem;
}

.cluster-popup strong {
  color: #1e3a5f;
}

.cluster-breakdown {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.cluster-breakdown span {
  font-size: 0.8rem;
}

.user-popup strong {
  color: #4F46E5;
}

/* Nearby Section */
.nearby-section {
  background: rgba(79, 70, 229, 0.15);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
}

.nearby-section h3 {
  color: white;
  font-size: 1rem;
  margin: 0 0 12px 0;
}

.nearby-list {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.nearby-card {
  display: flex;
  align-items: center;
  gap: 10px;
  background: white;
  border-radius: 12px;
  padding: 10px 14px;
  min-width: 160px;
  cursor: pointer;
  transition: transform 0.2s;
}

.nearby-card:hover {
  transform: translateY(-2px);
}

.nearby-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.nearby-info-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nearby-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: #1e3a5f;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100px;
}

.nearby-distance {
  font-size: 0.75rem;
  color: #4F46E5;
  font-weight: 600;
}

/* List View */
.list-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.facility-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.facility-card {
  background: white;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.facility-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 25px rgba(0, 0, 0, 0.2);
}

.facility-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.facility-type-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.facility-info {
  flex: 1;
  min-width: 0;
}

.facility-info h3 {
  margin: 0;
  font-size: 1rem;
  color: #1e3a5f;
  font-weight: 700;
}

.facility-type-label {
  font-size: 0.75rem;
  color: #666;
}

.source-badge {
  background: #FEE500;
  color: #3c1e1e;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 10px;
  flex-shrink: 0;
}

.facility-address {
  color: #666;
  font-size: 0.85rem;
  margin: 0 0 6px 0;
}

.facility-meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.facility-phone {
  color: #888;
  font-size: 0.8rem;
  margin: 0;
}

.facility-website {
  color: #4F46E5;
  font-size: 0.8rem;
}

/* Pagination */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px;
}

.pagination button {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: white;
  color: #1e3a5f;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination span {
  color: white;
  font-size: 0.9rem;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background: white;
  border-radius: 24px 24px 0 0;
  padding: 24px;
  width: 100%;
  max-width: 500px;
  max-height: 85vh;
  overflow-y: auto;
  position: relative;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border: none;
  background: #f0f0f0;
  border-radius: 50%;
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.modal-type-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  flex-shrink: 0;
}

.modal h2 {
  margin: 0;
  font-size: 1.3rem;
  color: #1e3a5f;
}

.modal-type {
  margin: 4px 0 0 0;
  color: #666;
  font-size: 0.85rem;
}

.data-source {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #FEF9C3;
  padding: 10px 14px;
  border-radius: 10px;
  margin-bottom: 16px;
  font-size: 0.85rem;
  color: #854d0e;
}

.source-icon {
  font-size: 1rem;
}

.cult-warning {
  background: #fef2f2;
  border: 1px solid #fca5a5;
  color: #dc2626;
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 0.9rem;
  margin-bottom: 16px;
}

.modal-section {
  margin-bottom: 16px;
}

.modal-section h4 {
  margin: 0 0 8px 0;
  color: #1e3a5f;
  font-size: 0.9rem;
}

.modal-section p {
  margin: 0;
  color: #444;
  font-size: 0.95rem;
  line-height: 1.5;
}

.distance-info {
  color: #4F46E5 !important;
  font-size: 0.85rem !important;
  margin-top: 6px !important;
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  flex-wrap: wrap;
}

.action-btn {
  flex: 1;
  min-width: 70px;
  padding: 12px 14px;
  border: none;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
  text-decoration: none;
  transition: transform 0.2s, opacity 0.2s;
}

.action-btn:hover {
  transform: scale(1.02);
}

.action-btn.kakao {
  background: linear-gradient(135deg, #fee500, #f5dc00);
  color: #3c1e1e;
}

.action-btn.website {
  background: linear-gradient(135deg, #4F46E5, #7C3AED);
  color: white;
}

.action-btn.call {
  background: linear-gradient(135deg, #059669, #0d9488);
  color: white;
}

.action-btn.naver {
  background: linear-gradient(135deg, #03C75A, #02a94e);
  color: white;
}

.modal-footer {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.data-note {
  font-size: 0.8rem;
  color: #888;
  margin: 0;
  line-height: 1.5;
}

/* Footer */
footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(30, 58, 95, 0.95);
  backdrop-filter: blur(10px);
  padding: 14px 16px;
  text-align: center;
}

footer p {
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.8rem;
}

footer a {
  color: #a5b4fc;
  text-decoration: none;
}

footer a:hover {
  text-decoration: underline;
}

/* Leaflet overrides */
.leaflet-popup-content-wrapper {
  border-radius: 12px;
}

.leaflet-popup-content {
  margin: 10px 14px;
}

/* Responsive */
@media (min-width: 768px) {
  .app {
    max-width: 600px;
    margin: 0 auto;
  }

  .map-container {
    height: 550px;
  }
}
`;

const targetPath = path.join(__dirname, 'src', 'App.css');
fs.writeFileSync(targetPath, cssContent, 'utf8');
console.log('App.css updated successfully!');
