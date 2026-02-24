import { EntitesService } from './entites.service';
import { EntitesListQueryDto } from './dto/entites-list-query.dto';
import { UpdateEntiteDto } from './dto/update-entite.dto';
export declare class EntitesController {
    private readonly entitesService;
    constructor(entitesService: EntitesService);
    list(query: EntitesListQueryDto): Promise<{
        items: import("./entites.service").EntiteListItem[];
    }>;
    getOne(id: string): Promise<{
        item: import("./entites.service").EntiteDetail;
    }>;
    update(id: string, payload: UpdateEntiteDto): Promise<{
        item: import("./entites.service").EntiteDetail;
    }>;
}
