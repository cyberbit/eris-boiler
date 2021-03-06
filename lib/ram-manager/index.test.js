import test from 'ava'
import sinon from 'sinon'

import RAMManager from '.'
import DatabaseQuery from '../database-query'
import { ExtendedMap } from '../../util'

const seedPeople = async (dbm) => {
  const seed = {
    db: 'int_test_people',
    data: {
      P1: {
        name: 'Alex',
        age: 15
      },
      P2: {
        name: 'Stephen',
        age: 16
      },
      P3: {
        name: 'Stephen',
        age: 12
      },
      P4: {
        name: 'Stephen',
        age: 21
      },
      P5: {
        name: 'Carl',
        age: 22
      }
    }
  }

  sinon.stub(dbm, '_addStoreIfNeeded')

  dbm._store.set(seed.db, new ExtendedMap())
  dbm._idCount.set(seed.db, 0)

  for (const person of Object.values(seed.data)) {
    await dbm.add(seed.db, person)
  }

  return seed
}

test('_addStoreIfNeeded/adds a store', (t) => {
  const dbm = new RAMManager()
  const type = 'new type'

  dbm._addStoreIfNeeded(type)

  t.deepEqual(dbm._store.get(type), new ExtendedMap())
  t.is(dbm._idCount.get(type), 0)
})

test('_addStoreIfNeeded/does not add a store', (t) => {
  const dbm = new RAMManager()
  const type = 'new type'
  dbm._store.set(type, new Map())
  sinon.spy(dbm._store, 'set')
  sinon.spy(dbm._idCount, 'set')

  dbm._addStoreIfNeeded(type)

  t.false(dbm._store.set.called)
  t.false(dbm._idCount.set.called)
})

test('_addStoreIfNeeded/adds an object', (t) => {
  const dbm = new RAMManager()
  const type = 'new type'
  const obj = { type, id: 1 }
  dbm._store.set(type, new Map())
  sinon.spy(dbm._store.get(type), 'set')

  dbm._addStoreIfNeeded(type, obj)

  t.true(dbm._store.get(type).set.calledOnceWithExactly(obj.id, obj))
})

test('get/gets by prop', async (t) => {
  const dbm = new RAMManager()

  const {
    db,
    data: {
      P2
    }
  } = await seedPeople(dbm)

  const getKey = 'age'
  const getValue = 16

  const res = await dbm.get({ type: db, getValue, getKey })

  t.deepEqual(res, P2)
})

test('find/finds a person by name', async (t) => {
  const dbm = new RAMManager()
  const {
    db,
    data: {
      P1
    }
  } = await seedPeople(dbm)
  const query = new DatabaseQuery(null, db).equalTo('name', P1.name)

  const res = await dbm.find(query)

  t.deepEqual(res, [ P1 ])
})

test('find/combines equalTo, lessThan, and greaterThan', async (t) => {
  const dbm = new RAMManager()
  const {
    db,
    data: {
      P2, P3
    }
  } = await seedPeople(dbm)
  const query = DatabaseQuery.and([
    new DatabaseQuery(null, db).equalTo('name', P2.name),
    DatabaseQuery.and([
      new DatabaseQuery(null, db).lessThan('age', P2.age + 1),
      new DatabaseQuery(null, db).greaterThan('age', P3.age - 1)
    ])
  ])

  const res = await dbm.find(query)

  t.deepEqual(res, [ P2, P3 ])
})

test('find/name or age range', async (t) => {
  const dbm = new RAMManager()
  const {
    db,
    data: {
      P1, P2, P3, P4
    }
  } = await seedPeople(dbm)

  const query = DatabaseQuery.or([
    new DatabaseQuery(dbm, db).equalTo('name', P2.name),
    DatabaseQuery.and([
      new DatabaseQuery(dbm, db).lessThan('age', P2.age + 1),
      new DatabaseQuery(dbm, db).greaterThan('age', P3.age - 1)
    ])
  ])

  const res = await dbm.find(query)

  t.deepEqual(res, [ P1, P2, P3, P4 ])
})
