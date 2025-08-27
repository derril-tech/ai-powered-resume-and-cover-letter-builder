import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { Users } from '../entities/users.entity';
import { Memberships } from '../entities/memberships.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Users, Memberships]),
    ],
    controllers: [UsersController],
    providers: [UsersService],
    exports: [UsersService],
})
export class UsersModule { }
