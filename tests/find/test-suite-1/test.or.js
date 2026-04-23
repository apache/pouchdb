'use strict';

describe('test.or.js', () => {
    beforeEach(async () => {
        await context.db.bulkDocs([
            { name: 'Mario', _id: 'mario', rank: 5, series: 'Mario', debut: 1981, awesome: true },
            { name: 'Jigglypuff', _id: 'puff', rank: 8, series: 'Pokemon', debut: 1996,
                awesome: false },
            { name: 'Link', rank: 10, _id: 'link', series: 'Zelda', debut: 1986, awesome: true },
            { name: 'Donkey Kong', rank: 7, _id: 'dk', series: 'Mario', debut: 1981, awesome: false },
            { name: 'Pikachu', series: 'Pokemon', _id: 'pikachu', rank: 1, debut: 1996, awesome: true },
            { name: 'Captain Falcon', _id: 'falcon', rank: 4, series: 'F-Zero', debut: 1990,
                awesome: true },
            { name: 'Luigi', rank: 11, _id: 'luigi', series: 'Mario', debut: 1983, awesome: false },
            { name: 'Fox', _id: 'fox', rank: 3, series: 'Star Fox', debut: 1993, awesome: true },
            { name: 'Ness', rank: 9, _id: 'ness', series: 'Earthbound', debut: 1994, awesome: true },
            { name: 'Samus', rank: 12, _id: 'samus', series: 'Metroid', debut: 1986, awesome: true },
            { name: 'Yoshi', _id: 'yoshi', rank: 6, series: 'Mario', debut: 1990, awesome: true },
            { name: 'Kirby', _id: 'kirby', series: 'Kirby', rank: 2, debut: 1992, awesome: true },
            { name: 'Master Hand', _id: 'master_hand', series: 'Smash Bros', rank: 0, debut: 1999,
                awesome: false }
        ]);
    });

    it('#6366 should do a basic $or', async () => {
        const db = context.db;
        const res = await db.find({
            selector: {
                "$or": [
                    { "name": "Link" },
                    { "name": "Mario" }
                ]
            }
        });
        const docs = res.docs.map((doc) => {
            return {
                _id: doc._id
            };
        });
        docs.should.deep.equal([
            {'_id': 'link'},
            {'_id': 'mario'},
        ]);
    });

    it('#6366 should do a basic $or, with explicit $eq', async () => {
        const db = context.db;
        const res = await db.find({
            selector: {
                "$or": [
                    { "name": {$eq: "Link"} },
                    { "name": {$eq: "Mario"} }
                ]
            }
        });
        const docs = res.docs.map((doc) => {
            return {
                _id: doc._id
            };
        });
        docs.should.deep.equal([
            {'_id': 'link'},
            {'_id': 'mario'},
        ]);
    });

    it('#7458 should do $or with nested $and', async () => {
        const db = context.db;
        const res = await db.find({
            selector: {
                "$or": [
                    { "name": {$eq: "Link"} },
                    {
                        "$and": [
                            {"name": "Mario"},
                            {"rank": 5}
                        ]
                    }
                ]
            }
        });
        const docs = res.docs.map((doc) => {
            return {
                _id: doc._id
            };
        });
        docs.should.deep.equal([
            {'_id': 'link'},
            {'_id': 'mario'},
        ]);
    });

    it('#7458 should do $or with nested $and, with explicit $eq', async () => {
        const db = context.db;
        const res = await db.find({
            selector: {
                "$or": [
                    { "name": {$eq: "Link"} },
                    {
                        "$and": [
                            {"name": {$eq: "Mario"}},
                            {"rank": {$eq: 5}}
                        ]
                    }
                ]
            }
        });
        const docs = res.docs.map((doc) => {
            return {
                _id: doc._id
            };
        });
        docs.should.deep.equal([
            {'_id': 'link'},
            {'_id': 'mario'},
        ]);
    });
    describe("nested $or inside $and", () => {
        it('equal length $ors', async () => {
            const db = context.db;
            const index = {
                "index": {
                    "fields": ["field.a"]
                }
            };

            const selector = {
                $and: [
                    {
                        $or: [
                            {a: 1},
                            {b: 2}
                        ]
                    },
                    {
                        $or: [
                            {a: 3},
                            {b: 4}
                        ]
                    }
                ]
            };
            await db.createIndex(index);
            await db.bulkDocs([
                {_id: '1', a: 1, b: 2},
                {_id: '2', a: 1, b: 4},
                {_id: '3', a: 3, b: 2},
                {_id: '4', a: 3, b: 4},
            ]);
            const resp = await db.find({
                selector,
                fields: ["_id"]
            });
            resp.docs.should.deep.equal([{_id: '2'}, {_id: '3'}]);
            if (db.adapter === "local") {
                const explainResp = await db.explain({
                    selector,
                    fields: ["_id"]
                });
                explainResp.selector.should.deep.equal({
                "$or": [
                        {"a": {"$eq": 1}, "b": {"$eq": 4}},
                        {"a": {"$eq": 3}, "b": {"$eq": 2}}
                    ]
                });
            }
        });
        it('first $or length less than second', async () => {
            const db = context.db;
            const index = {
                "index": {
                    "fields": ["field.a"]
                }
            };

            const selector = {
                $and: [
                    {
                        $or: [
                            {c: 2},
                        ]
                    },
                    {
                        $or: [
                            {a: 1},
                            {b: 1},
                        ]
                    },
                ]
            };
            await db.createIndex(index);
            await db.bulkDocs([
                {_id: '1', a: 1, b: 2, c: 2},
                {_id: '2', a: 2, b: 2, c: 2},
                {_id: '3', a: 2, b: 1, c: 2},
                {_id: '4', a: 2, b: 2, c: 2},
            ]);
            const resp = await db.find({
                selector,
                fields: ["_id"]
            });
            resp.docs.should.deep.equal([{_id: '1'}, {_id: '3'}]);
            if (db.adapter === "local") {
                const explainResp = await db.explain({
                    selector,
                    fields: ["_id"]
                });
                console.log(explainResp.selector);
                explainResp.selector.should.deep.equal({
                    "$or": [
                        {"a": {"$eq": 1}, "c": {"$eq": 2}},
                        {"b": {"$eq": 1}, "c": {"$eq": 2}}
                    ]
                });
            }
        });
        it('second $or length less than first', async () => {
            const db = context.db;
            const index = {
                "index": {
                    "fields": ["field.a"]
                }
            };

            const selector = {
                $and: [
                    {
                        $or: [
                            {a: 1},
                            {b: 1},
                        ]
                    },
                    {
                        $or: [
                            {c: 2},
                        ]
                    },
                ]
            };
            await db.createIndex(index);
            await db.bulkDocs([
                {_id: '1', a: 1, b: 2, c: 2},
                {_id: '2', a: 2, b: 2, c: 2},
                {_id: '3', a: 2, b: 1, c: 2},
                {_id: '4', a: 2, b: 2, c: 2},
            ]);
            const resp = await db.find({
                selector,
                fields: ["_id"]
            });
            resp.docs.should.deep.equal([{_id: '1'}, {_id: '3'}]);
            if (db.adapter === "local") {
                const explainResp = await db.explain({
                    selector,
                    fields: ["_id"]
                });
                explainResp.selector.should.deep.equal({
                    "$or": [
                        {"a": {"$eq": 1}, "c": {"$eq": 2}},
                        {"b": {"$eq": 1}, "c": {"$eq": 2}}
                    ]
                });
            }
        });
        it('should do complex queries', async () => {
            const db = context.db;
            const index = {
                "index": {
                    "fields": ["field.a"]
                }
            };

            const selector = {
                $or: [
                    {
                        $and: [
                        {
                            $or: [
                                {
                                    $or: [
                                        {
                                            $and: [
                                                {due: {important: true}},
                                                {tags: {$all: ["home"]}},
                                            ]
                                        },
                                        // implicit and
                                        {due: {date: "soon", important:false}},
                                    ]
                                },
                                {due: {date: "tomorrow"}},
                            ]
                        },
                        {
                            $or: [
                                {assigned: "me"},
                                {assigned: "other1"},
                            ]
                        },
                        {include: true}
                            ]
                    }
                ]
            };
            await db.createIndex(index);
            await db.bulkDocs([
                {_id: '1', include:true, due: {repeating: true, date: "friday"}, tags: ["home"], assigned: "other2"},
                {_id: '2', include:true, due: {repeating: true, date: "friday", important: true}, tags: ["home"], assigned: "other1"},
                {_id: '3', include:true, due: {repeating: false, date: "soon", important: false}, tags: ["home"], assigned: "me"},
                {_id: '4', include:true, due: {repeating: false, date: "tuesday"}, tags: ["home"], assigned: "me"},
                {_id: '5', include:true, due: {repeating: true, date: "friday", important: true}, tags: ["work"], assigned: "me"},
                {_id: '6', include:true, due: {repeating: false, date: "tomorrow"}, tags: ["health"], assigned: "me"},
                {_id: '7', include:false, due: {repeating: false, date: "tomorrow"}, tags: ["health"], assigned: "me"},
            ]);
            const resp = await db.find({
                selector,
                fields: ["_id"]
            });
            resp.docs.should.deep.equal([{_id: '2'}, {_id: '3'}, {_id: '6'}]);
            if (db.adapter === "local") {
                const explainResp = await db.explain({
                    selector,
                    fields: ["_id"]
                });
                console.log(JSON.stringify(explainResp.selector, null, "\t"));

                explainResp.selector.should.deep.equal({
                    $or: [
                        {
                            $or: [
                                {
                                    due: {important: true},
                                    tags: {$all: ["home"]},
                                },
                                {
                                    due: {
                                        date: "soon",
                                        important: false
                                    }
                                },
                            ],
                            assigned: {$eq: "me"},
                        },
                        {
                            $or: [
                                {
                                    due: {important: true},
                                    tags: {$all: ["home"]},
                                },
                                {
                                    due: {
                                        date: "soon",
                                        important: false
                                    }
                                },
                            ],
                            assigned: {$eq: "other1"},
                        },
                        {
                            due: {date: "tomorrow"},
                            assigned: {$eq: "me"},
                        },
                        {
                            due: {date: "tomorrow"},
                            assigned: {$eq: "other1"},
                        },
                    ],
                    include: {
                        $eq: true,
                    },
                });
            }
        });
    });
});
