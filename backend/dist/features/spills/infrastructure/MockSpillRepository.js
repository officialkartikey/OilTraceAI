"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockSpillRepository = void 0;
class MockSpillRepository {
    constructor() {
        this.spills = [
            {
                id: 'spill-001',
                name: 'Mumbai Coast Incident',
                detectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
                status: 'ACTIVE',
                areaSqKm: 42,
                currentLocation: { lat: 18.85, lng: 72.75 },
                hindcastOrigin: { lat: 18.80, lng: 72.70, estimatedTime: new Date(Date.now() - 6 * 60 * 60 * 1000) },
                confidence: 94
            },
            {
                id: 'spill-002',
                name: 'Kochi Offshore Slick',
                detectedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
                status: 'VERIFYING',
                areaSqKm: 12,
                currentLocation: { lat: 9.90, lng: 75.80 },
                hindcastOrigin: { lat: 9.85, lng: 75.75, estimatedTime: new Date(Date.now() - 12 * 60 * 60 * 1000) },
                confidence: 76
            }
        ];
    }
    getAllActiveSpills() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.spills.filter(s => s.status === 'ACTIVE' || s.status === 'VERIFYING');
        });
    }
    getSpillById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.spills.find(s => s.id === id) || null;
        });
    }
    createSpill(spill) {
        return __awaiter(this, void 0, void 0, function* () {
            const newSpill = Object.assign(Object.assign({}, spill), { id: `spill-${Date.now()}` });
            this.spills.push(newSpill);
            return newSpill;
        });
    }
}
exports.MockSpillRepository = MockSpillRepository;
