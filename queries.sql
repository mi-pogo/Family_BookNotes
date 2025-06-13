CREATE TABLE IF NOT EXISTS public.users
(
    id integer NOT NULL,
    first_name text,
    last_name text,
    pic_id integer,
    CONSTRAINT users_pkey PRIMARY KEY (id)
)

CREATE TABLE IF NOT EXISTS public.read_books
(
    id integer NOT NULL,
    title text,
    author text,
    usr_note text,
    usr_rating integer,
    usr_read_date date,
    usr_id integer,
    cover_id bigint,
    CONSTRAINT read_books_pkey PRIMARY KEY (id),
    CONSTRAINT unique_book_idx UNIQUE (title, author, usr_id),
    CONSTRAINT read_books_usr_id_fkey FOREIGN KEY (usr_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)
