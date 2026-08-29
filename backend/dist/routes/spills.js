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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const GetActiveSpillsUseCase_1 = require("../features/spills/application/GetActiveSpillsUseCase");
const MockSpillRepository_1 = require("../features/spills/infrastructure/MockSpillRepository");
const router = express_1.default.Router();
const spillRepository = new MockSpillRepository_1.MockSpillRepository();
const getActiveSpillsUseCase = new GetActiveSpillsUseCase_1.GetActiveSpillsUseCase(spillRepository);
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const spills = yield getActiveSpillsUseCase.execute();
        return res.json({ success: true, data: spills });
    }
    catch (error) {
        console.error('Failed to fetch spills:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}));
exports.default = router;
