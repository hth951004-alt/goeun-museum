import {defineArrayMember, defineField, defineType} from 'sanity'

const YEARS = Array.from({length: 41}, (_, index) => 1990 + index)

export const work = defineType({
  name: 'work',
  title: '작업',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: '작업명',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'thumbnail',
      title: '썸네일',
      type: 'image',
      options: {hotspot: true},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'year',
      title: '연도',
      type: 'number',
      options: {
        list: YEARS.map((year) => ({title: String(year), value: year})),
        layout: 'dropdown',
      },
    }),
    defineField({
      name: 'workType',
      title: '작업 유형',
      type: 'string',
    }),
    defineField({
      name: 'detailImages',
      title: '작업 상세 이미지',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'image',
          options: {hotspot: true},
        }),
      ],
    }),
    defineField({
      name: 'workInfo',
      title: '작업 정보',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({
              name: 'label',
              title: '항목명',
              type: 'string',
            }),
            defineField({
              name: 'value',
              title: '내용',
              type: 'string',
            }),
          ],
          preview: {
            select: {title: 'label', subtitle: 'value'},
          },
        }),
      ],
    }),
    defineField({
      name: 'description',
      title: '작업 설명',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            {title: '본문', value: 'normal'},
            {title: '제목', value: 'h2'},
            {title: '소제목', value: 'h3'},
            {title: '인용', value: 'blockquote'},
          ],
          lists: [
            {title: '글머리 기호', value: 'bullet'},
            {title: '번호', value: 'number'},
          ],
          marks: {
            decorators: [
              {title: '굵게', value: 'strong'},
              {title: '기울임', value: 'em'},
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: '링크',
                fields: [
                  defineField({
                    name: 'href',
                    title: 'URL',
                    type: 'url',
                  }),
                ],
              },
            ],
          },
        }),
      ],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'year',
      media: 'thumbnail',
    },
  },
})
