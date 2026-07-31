import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(body: any): Promise<{
        access_token: string;
        user: {
            id: string;
            email: string | null;
            username: string;
            nipNbm: string | null;
            name: string;
            role: string;
            subRole: string | null;
            subRole2: string | null;
            subRole3: string | null;
        };
    }>;
    googleLogin(body: {
        email: string;
    }): Promise<{
        access_token: string;
        user: {
            id: string;
            email: string | null;
            username: string;
            nipNbm: string | null;
            name: string;
            role: string;
            subRole: string | null;
            subRole2: string | null;
            subRole3: string | null;
        };
    }>;
    linkGoogle(body: any): Promise<{
        access_token: string;
        user: {
            id: string;
            email: string | null;
            username: string;
            nipNbm: string | null;
            name: string;
            role: string;
            subRole: string | null;
            subRole2: string | null;
            subRole3: string | null;
        };
    }>;
}
