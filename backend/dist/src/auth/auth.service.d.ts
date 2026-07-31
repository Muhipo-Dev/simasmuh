import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
export declare class AuthService {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    login(emailOrUsername: string, password: string): Promise<{
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
    googleLogin(email: string): Promise<{
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
    linkGoogleAccount(email: string, username: string, password: string): Promise<{
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
