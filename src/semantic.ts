import type { faker as FakerType } from '@faker-js/faker'

type FakerInstance = typeof FakerType

function match(key: string, ...patterns: string[]): boolean {
  const lower = key.toLowerCase()
  return patterns.some(p => lower.includes(p))
}

export function getSemanticDefault(
  keyName: string,
  seq: number,
  fakerInstance: FakerInstance | null,
): unknown {
  const f = fakerInstance

  if (match(keyName, 'email')) {
    return f ? f.internet.email() : `user-${seq}@example.com`
  }

  if (match(keyName, 'firstname', 'first_name')) {
    return f ? f.person.firstName() : 'John'
  }

  if (match(keyName, 'lastname', 'last_name')) {
    return f ? f.person.lastName() : 'Doe'
  }

  if (match(keyName, 'username')) {
    return f ? f.internet.username() : `user_${seq}`
  }

  // 'name' standalone — must not match 'username', 'firstname', 'lastname'
  if (/^name$|[^a-z]name$|^name[^a-z]/i.test(keyName) || keyName.toLowerCase() === 'name') {
    if (!match(keyName, 'username', 'firstname', 'first_name', 'lastname', 'last_name', 'filename', 'hostname', 'pathname', 'dirname', 'tablename', 'columnname', 'typename', 'domainname', 'nickname', 'codename', 'surname')) {
      return f ? f.person.fullName() : `Entity ${seq}`
    }
  }

  if (match(keyName, 'slug')) {
    return f ? f.helpers.slugify(f.lorem.words(2)) : `slug-${seq}`
  }

  if (match(keyName, 'phonenumber', 'phone_number', 'phone')) {
    return f ? f.phone.number() : `+1555000${String(seq).padStart(4, '0')}`
  }

  if (match(keyName, 'website', 'url')) {
    return f ? f.internet.url() : `https://example-${seq}.com`
  }

  if (match(keyName, 'description', 'bio', 'content', 'body')) {
    return f ? f.lorem.paragraph() : 'Lorem ipsum dolor sit amet'
  }

  if (match(keyName, 'title')) {
    return f ? f.lorem.sentence(3) : `Title ${seq}`
  }

  if (match(keyName, 'createdat', 'created_at', 'updatedat', 'updated_at')) {
    return new Date()
  }

  if (match(keyName, 'deletedat', 'deleted_at')) {
    return null
  }

  if (match(keyName, 'isverified', 'verified', 'isactive', 'active', 'enabled')) {
    return true
  }

  if (match(keyName, 'count', 'quantity', 'amount', 'total')) {
    return seq
  }

  if (match(keyName, 'price', 'cost')) {
    return seq * 10
  }

  if (match(keyName, 'order', 'position', 'rank', 'sort', 'index')) {
    return seq
  }

  if (match(keyName, 'avatar', 'image', 'photo', 'picture', 'thumbnail')) {
    return f ? f.image.avatar() : null
  }

  if (match(keyName, 'token', 'secret', 'hash', 'password')) {
    return `secret-${seq}`
  }

  if (match(keyName, 'code')) {
    return `CODE${String(seq).padStart(4, '0')}`
  }

  if (match(keyName, 'city')) {
    return f ? f.location.city() : `City ${seq}`
  }

  if (match(keyName, 'country')) {
    return f ? f.location.country() : 'US'
  }

  if (match(keyName, 'address')) {
    return f ? f.location.streetAddress() : `${seq} Main St`
  }

  if (match(keyName, 'zipcode', 'zip_code', 'postalcode', 'postal_code', 'zip')) {
    return f ? f.location.zipCode() : '10001'
  }

  return undefined
}
