create database Mercado character set utf8mb4;
CREATE DATABASE IF NOT EXISTS

create table PRODUTO(
	ID_produto int auto_increment primary key,
	nome varchar(200),
	data_validade data,
	estoque int,
	preco decimal,
);

create table PROMOCAO(
	ID_promocao int auto_increment primary key
	foreign key (ID_promocao) references ID_produto (PRODUTO),
	desconto int,
);

create table FUNCIONARIO(
	ID_funcionario int auto_increment primary key,
	nome varchar(200),
	Email varchar(200),
	CPF int,
);

create table GERENTE(
	ID_gerente int auto_increment primary key,
	nome varchar(200),
	Email varchar(200),
	CPF int,
);

create table CLIENTE(
	ID_cliente int auto_increment primary key,
	Email varchar(200),
	nome varchar(200),
	telefone varchar(20),
);

create table LISTA_DE_COMPRA(
	ID_lista int auto_increment primary key,
	ID_comprador int
	foreign key (ID_comprador) references ID_cliente (CLIENTE),
	confirmacao bool,
	ID_prod int
	foreign key (ID_prod) references ID_produto (PRODUTO),
);